import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { appStore } from './server/dataStore.ts';
import { analyzeLogicGraph, type RawExtractionInput } from './server/logicGraphEngine.ts';
import { trainedClassifier } from './server/mlClassifier.ts';
import {
  AnalysisCache,
  fetchArticleTextFromUrl,
  SlidingWindowRateLimiter,
  validatePublicUrl,
} from './server/securityAndCache.ts';
import type { GroundingSource, ModelFeatureVector } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const analysisCache = new AnalysisCache(120, 30 * 60 * 1000);
const rateLimiter = new SlidingWindowRateLimiter(30, 60_000);

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractGroundingSources(response: unknown): GroundingSource[] {
  const res = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
        }>;
      };
    }>;
  };
  const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    const title = chunk.web?.title || uri;
    if (uri && title && !seen.has(uri)) {
      seen.add(uri);
      sources.push({ title, url: uri });
    }
  }
  return sources.slice(0, 6);
}

async function callWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

function looksLikeSingleUrl(text: string): boolean {
  const trimmed = text.trim();
  return /^https?:\/\/\S+$/i.test(trimmed) && !trimmed.includes('\n');
}

const extractionSchema = {
  type: Type.OBJECT,
  properties: {
    claims: {
      type: Type.ARRAY,
      description: '3 to 7 clear individual claims extracted from the article.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Short ID like c1, c2, c3' },
          shortLabel: {
            type: Type.STRING,
            description: 'Very short 3-6 word label for the graph node.',
          },
          text: {
            type: Type.STRING,
            description: 'Clear 1-sentence statement of the claim.',
          },
          kind: {
            type: Type.STRING,
            enum: ['FACT', 'OPINION'],
            description: 'FACT if checkable against evidence; OPINION if subjective value judgment.',
          },
          truth: {
            type: Type.STRING,
            enum: ['TRUE', 'FALSE', 'UNVERIFIED', 'NOT_APPLICABLE'],
            description: 'For FACT: TRUE, FALSE, or UNVERIFIED. For OPINION: NOT_APPLICABLE.',
          },
          explanation: {
            type: Type.STRING,
            description: 'Plain-English 1-sentence reason why this claim is true, false, unverified, or an opinion.',
          },
        },
        required: ['id', 'shortLabel', 'text', 'kind', 'truth', 'explanation'],
      },
    },
    edges: {
      type: Type.ARRAY,
      description: 'Logical relationships connecting the extracted claims.',
      items: {
        type: Type.OBJECT,
        properties: {
          sourceId: { type: Type.STRING, description: 'ID of the premise/source claim.' },
          targetId: { type: Type.STRING, description: 'ID of the target claim.' },
          relation: {
            type: Type.STRING,
            enum: ['SUPPORT', 'CONTRADICT', 'JUMP'],
            description: 'SUPPORT if source logically backs target; CONTRADICT if they clash; JUMP if conclusion leaps without logical backing.',
          },
          reason: {
            type: Type.STRING,
            description: 'Simple 1-sentence explanation of how these two claims connect.',
          },
        },
        required: ['sourceId', 'targetId', 'relation', 'reason'],
      },
    },
  },
  required: ['claims', 'edges'],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Persistent Trusted Facts API
  app.get('/api/facts', (_req, res) => {
    res.json({ facts: appStore.getFacts() });
  });

  app.post('/api/facts', (req, res) => {
    const statement = typeof req.body?.statement === 'string' ? req.body.statement.trim() : '';
    if (statement.length < 5 || statement.length > 300) {
      res.status(400).json({ error: 'Fact must be between 5 and 300 characters.' });
      return;
    }
    const created = appStore.addFact(statement);
    analysisCache.clear();
    res.status(201).json({ fact: created, facts: appStore.getFacts() });
  });

  app.delete('/api/facts/:id', (req, res) => {
    const facts = appStore.removeFact(req.params.id);
    analysisCache.clear();
    res.json({ facts });
  });

  // Persistent Check History API
  app.get('/api/history', (_req, res) => {
    res.json({ history: appStore.getHistory() });
  });

  app.delete('/api/history', (_req, res) => {
    appStore.clearHistory();
    res.json({ history: [] });
  });

  // Trained ML Classifier API
  app.get('/api/model', (_req, res) => {
    res.json(trainedClassifier.getSummary());
  });

  app.post('/api/model/retrain', (_req, res) => {
    trainedClassifier.retrain();
    analysisCache.clear();
    res.json(trainedClassifier.getSummary());
  });

  app.post('/api/model/reset', (_req, res) => {
    const summary = trainedClassifier.resetToBaseAndRetrain();
    analysisCache.clear();
    res.json(summary);
  });

  app.post('/api/model/teach', (req, res) => {
    const label = typeof req.body?.label === 'string' ? req.body.label.trim() : 'User-labeled article';
    const expected = req.body?.expected === 'REAL' || req.body?.expected === 'FAKE'
      ? req.body.expected
      : null;
    const features = req.body?.features as ModelFeatureVector | undefined;

    if (!expected || !features || typeof features.trueFactRatio !== 'number') {
      res.status(400).json({ error: 'Invalid training example payload.' });
      return;
    }

    const summary = trainedClassifier.addSampleAndRetrain(label, expected, features);
    analysisCache.clear();
    res.json(summary);
  });

  // Core Fact & Logic Analysis API (supports pasted text or public URLs + caching + rate limiting)
  app.post('/api/analyze', async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rateCheck = rateLimiter.allow(clientIp);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSec));
      res.status(429).json({
        error: `Rate limit reached. Please wait ${rateCheck.retryAfterSec} seconds before checking another article.`,
      });
      return;
    }

    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const rawUrlInput = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    const targetUrlRaw = rawUrlInput || (looksLikeSingleUrl(rawText) ? rawText : '');

    const storedFacts = appStore.getFacts().map((f) => f.statement);
    const bodyFacts = Array.isArray(req.body?.customFacts)
      ? req.body.customFacts
          .filter((item: unknown): item is string => typeof item === 'string')
          .map((item: string) => item.trim())
          .filter((item: string) => item.length >= 5 && item.length <= 300)
      : [];
    const customFacts = Array.from(new Set([...storedFacts, ...bodyFacts])).slice(0, 30);

    const modelSummary = trainedClassifier.getSummary();
    const cacheSourceKey = targetUrlRaw || rawText;
    const cacheKey = analysisCache.buildKey(
      cacheSourceKey,
      customFacts,
      modelSummary.lastTrainedAt,
    );

    const cachedResult = analysisCache.get(cacheKey);
    if (cachedResult) {
      res.json({ ...cachedResult, cached: true });
      return;
    }

    let articleText = rawText;
    let checkedSourceUrl: string | undefined;

    if (targetUrlRaw) {
      const validation = validatePublicUrl(targetUrlRaw);
      if (!validation.valid) {
        res.status(400).json({ error: validation.reason });
        return;
      }
      checkedSourceUrl = validation.url.toString();

      const fetchedText = await fetchArticleTextFromUrl(validation.url);
      if (fetchedText) {
        articleText = fetchedText;
      } else {
        // Fallback: use Gemini URL Context tool if direct HTML fetch was blocked
        try {
          const ai = getAiClient();
          const urlReadResponse = await callWithRetry(
            () =>
              ai.models.generateContent({
                model: 'gemini-4-hydrogen',
                contents: `Read the article at ${checkedSourceUrl} and reproduce its main headline and key factual and opinion statements concisely in plain text.`,
                config: {
                  tools: [{ urlContext: {} }],
                  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                },
              }),
            1,
          );
          articleText = (urlReadResponse.text ?? '').trim();
        } catch {
          articleText = '';
        }

        if (articleText.length < 25) {
          res.status(422).json({
            error: 'Could not read text from that link. Try copying and pasting the article text directly.',
          });
          return;
        }
      }
    }

    if (articleText.length < 20) {
      res.status(400).json({
        error: 'Please enter at least a sentence or two (20+ characters) or paste a public article link.',
      });
      return;
    }

    if (articleText.length > 12000) {
      articleText = articleText.slice(0, 12000);
    }

    try {
      const ai = getAiClient();

      // Step 1: Attempt real-world fact check using Google Search Grounding
      let factBrief = '';
      let sources: GroundingSource[] = [];
      try {
        const factBriefResponse = await callWithRetry(
          () =>
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: `Fact-check the factual claims in the following text using reliable, well-established sources. Be balanced and fair: do not mark emerging or ordinary news as false unless it contradicts well-established facts or scientific consensus. Keep your notes concise.\n\nTEXT:\n${articleText}`,
              config: {
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            }),
          1,
        );
        factBrief = factBriefResponse.text ?? '';
        sources = extractGroundingSources(factBriefResponse);
      } catch (searchErr) {
        const searchStatus = (searchErr as { status?: number })?.status;
        console.warn('Search grounding skipped:', searchStatus || searchErr);
      }

      // Step 2: Structured extraction into Propositional Claims & Graph Edges
      const evidenceSection = factBrief
        ? `\nFACT-CHECK EVIDENCE:\n${factBrief}\n`
        : '';
      const customFactsSection =
        customFacts.length > 0
          ? `\nUSER TRUSTED FACT DATABASE (treat these known facts as TRUE when checking contradictions):\n${customFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n`
          : '';

      const generateStructured = (modelName: string) =>
        ai.models.generateContent({
          model: modelName,
          contents: `Break the article below into 3 to 7 atomic claims and map how they logically connect to one another.

Rules:
1. Separate FACT from OPINION. Only mark FACT claims as TRUE, FALSE, or UNVERIFIED. Mark OPINION claims as NOT_APPLICABLE.
2. Evaluate truth fairly against well-established real-world facts, the User Trusted Fact Database (if provided), and any Fact-Check Evidence provided (do not mark ordinary true events as false).
3. Create logical edges between claims:
   - SUPPORT: Claim A logically supports or explains Claim B.
   - CONTRADICT: Claim A contradicts Claim B, or an internal claim clashes with another claim.
   - JUMP: Claim B makes an illogical leap or conspiracy-style jump from Claim A without real proof.
4. Keep every label and explanation super simple, clear, and friendly for an everyday reader.
${evidenceSection}${customFactsSection}
ARTICLE TO ANALYZE:
${articleText}`,
          config: {
            systemInstruction:
              'You are a clear, impartial fact-checking assistant using propositional logic and claim-connection graphs. Return strictly valid JSON matching the schema.',
            responseMimeType: 'application/json',
            responseSchema: extractionSchema,
            ...(modelName === 'gemini-4-hydrogen'
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
              : {}),
          },
        });

      let structuredResponse;
      try {
        structuredResponse = await callWithRetry(() =>
          generateStructured('gemini-4-hydrogen'),
        );
      } catch (primaryErr) {
        const status = (primaryErr as { status?: number })?.status;
        if (status === 503 || status === 500) {
          structuredResponse = await callWithRetry(
            () => generateStructured('gemini-3.1-flash-lite'),
            1,
          );
        } else {
          throw primaryErr;
        }
      }

      const rawTextOut = (structuredResponse.text ?? '').trim();
      const parsed = JSON.parse(rawTextOut) as RawExtractionInput;

      if (!Array.isArray(parsed.claims) || parsed.claims.length === 0) {
        res.status(422).json({
          error: 'Could not extract clear claims from that text. Try pasting a news paragraph or headline.',
        });
        return;
      }

      const result = analyzeLogicGraph(parsed, sources);
      if (checkedSourceUrl) {
        result.checkedSourceUrl = checkedSourceUrl;
      }

      analysisCache.set(cacheKey, result);

      const snippetSource = checkedSourceUrl || articleText;
      appStore.addHistory({
        id: `${Date.now()}`,
        snippet:
          snippetSource.length > 90
            ? `${snippetSource.slice(0, 90)}...`
            : snippetSource,
        fullText: checkedSourceUrl || articleText,
        checkedAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        result,
      });

      res.json(result);
    } catch (error) {
      const errObj = error as { status?: number; message?: string };
      let cleanMessage = errObj?.message || 'Unable to analyze the article right now. Please try again.';
      try {
        const nested = JSON.parse(cleanMessage) as { error?: { message?: string; code?: number } };
        if (nested?.error?.message) {
          cleanMessage = nested.error.message;
        }
      } catch {
        // Message is already plain text
      }

      console.error('Analysis error:', cleanMessage);

      if (errObj?.status === 400 || errObj?.status === 403) {
        res.status(errObj.status).json({
          error: 'API key issue detected. Please verify GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }

      if (errObj?.status === 429) {
        res.status(429).json({
          error: 'Too many requests right now. Please wait a few seconds and try again.',
        });
        return;
      }

      if (errObj?.status === 503) {
        res.status(503).json({
          error: 'The AI service is temporarily busy. Please try again in a few moments.',
        });
        return;
      }

      res.status(500).json({ error: cleanMessage });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClaimCheck server listening on http://localhost:${PORT}`);
  });
}

startServer();
