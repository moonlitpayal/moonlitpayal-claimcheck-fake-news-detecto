import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Clock,
  Eraser,
  FileText,
  Link2,
  Loader2,
  SearchCheck,
  Trash2,
} from 'lucide-react';
import { AnalysisResult } from './components/AnalysisResult.tsx';
import { BenchmarkSuite } from './components/BenchmarkSuite.tsx';
import { CustomFactsPanel } from './components/CustomFactsPanel.tsx';
import { type AppTab, Header } from './components/Header.tsx';
import { ModelTrainingPanel } from './components/ModelTrainingPanel.tsx';
import { SAMPLE_ARTICLES } from './data/sampleArticles.ts';
import type { AnalysisResponse, CustomFact, HistoryEntry } from './types.ts';

type InputMode = 'text' | 'url';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('checker');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [articleText, setArticleText] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [customFacts, setCustomFacts] = useState<CustomFact[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const refreshServerData = async () => {
    try {
      const [factsRes, historyRes] = await Promise.all([
        fetch('/api/facts'),
        fetch('/api/history'),
      ]);
      if (factsRes.ok) {
        const fData = (await factsRes.json()) as { facts: CustomFact[] };
        if (Array.isArray(fData.facts)) setCustomFacts(fData.facts);
      }
      if (historyRes.ok) {
        const hData = (await historyRes.json()) as { history: HistoryEntry[] };
        if (Array.isArray(hData.history)) setHistory(hData.history);
      }
    } catch {
      // Keep UI functional even if initial background sync fails
    }
  };

  useEffect(() => {
    void refreshServerData();
  }, []);

  const runAnalysis = async (payload: { text?: string; url?: string }) => {
    const trimmedText = payload.text?.trim() ?? '';
    const trimmedUrl = payload.url?.trim() ?? '';

    if (inputMode === 'url' && !trimmedUrl && !trimmedText) {
      setError('Please paste a public article link starting with https://.');
      return;
    }

    if (inputMode === 'text' && trimmedText.length < 20 && !/^https?:\/\/\S+$/i.test(trimmedText)) {
      setError('Please paste at least one or two sentences (or a full web link) to check.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmedText || undefined,
          url: trimmedUrl || undefined,
          customFacts: customFacts.map((f) => f.statement),
        }),
      });

      const data = (await response.json()) as AnalysisResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Could not check this article right now.');
      }

      setResult(data);
      void refreshServerData();

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while checking the article.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === 'url') {
      void runAnalysis({ url: articleUrl });
    } else {
      void runAnalysis({ text: articleText });
    }
  };

  const handleSelectSample = (sampleText: string) => {
    setInputMode('text');
    setArticleText(sampleText);
    setError(null);
    void runAnalysis({ text: sampleText });
  };

  const handleNewCheck = () => {
    setActiveTab('checker');
    setArticleText('');
    setArticleUrl('');
    setResult(null);
    setError(null);
    setTimeout(() => {
      if (inputMode === 'url') {
        urlInputRef.current?.focus();
      } else {
        textareaRef.current?.focus();
      }
    }, 40);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInspectBenchmarkResult = (
    text: string,
    benchResult: AnalysisResponse,
  ) => {
    setInputMode('text');
    setArticleText(text);
    setResult(benchResult);
    setError(null);
    setActiveTab('checker');
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleAddFact = async (statement: string) => {
    try {
      const res = await fetch('/api/facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement }),
      });
      if (res.ok) {
        const data = (await res.json()) as { facts: CustomFact[] };
        setCustomFacts(data.facts);
      }
    } catch {
      // Fallback if offline
    }
  };

  const handleRemoveFact = async (id: string) => {
    try {
      const res = await fetch(`/api/facts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = (await res.json()) as { facts: CustomFact[] };
        setCustomFacts(data.facts);
      }
    } catch {
      // Ignore error
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setHistory([]);
    } catch {
      setHistory([]);
    }
  };

  const charCount = articleText.trim().length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNewCheck={handleNewCheck}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-10">
        {activeTab === 'checker' && (
          <>
            {/* Hero & Simple Article Checker */}
            <section id="checker" className="flex flex-col gap-6">
              <div className="max-w-2xl">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
                  Check if an article holds together logically.
                </h1>
                <p className="mt-2.5 text-base text-slate-600 leading-relaxed">
                  Paste any news text or web link below. We separate facts from opinions, verify each claim, and map how they support or contradict each other.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    role="tablist"
                    aria-label="Input method"
                    className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={inputMode === 'text'}
                      onClick={() => {
                        setInputMode('text');
                        setError(null);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        inputMode === 'text'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      Paste Text
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={inputMode === 'url'}
                      onClick={() => {
                        setInputMode('url');
                        setError(null);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        inputMode === 'url'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Article Link
                    </button>
                  </div>

                  {inputMode === 'text' && (
                    <span className="text-xs text-slate-500 tabular-nums">
                      {charCount} characters
                    </span>
                  )}
                </div>

                {inputMode === 'text' ? (
                  <textarea
                    id="article-input"
                    ref={textareaRef}
                    rows={5}
                    value={articleText}
                    onChange={(e) => {
                      setArticleText(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Paste a news paragraph, headline, forwarded message, or public https:// link..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-colors resize-y"
                  />
                ) : (
                  <input
                    id="article-url-input"
                    ref={urlInputRef}
                    type="url"
                    value={articleUrl}
                    onChange={(e) => {
                      setArticleUrl(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="https://example.com/news/article-to-check"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-colors"
                  />
                )}

                {error && (
                  <div
                    role="alert"
                    className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5"
                  >
                    {error}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (inputMode === 'url') {
                        setArticleUrl('');
                        urlInputRef.current?.focus();
                      } else {
                        setArticleText('');
                        textareaRef.current?.focus();
                      }
                      setError(null);
                    }}
                    disabled={(inputMode === 'url' ? !articleUrl : !articleText) || isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors cursor-pointer"
                  >
                    <Eraser className="w-4 h-4" aria-hidden="true" />
                    Clear
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Checking claims...
                      </>
                    ) : (
                      <>
                        <SearchCheck className="w-4 h-4" aria-hidden="true" />
                        Check Article
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* One-Click Sample Tests */}
              <div id="samples" className="flex flex-col gap-2.5">
                <span className="text-xs font-medium text-slate-500">
                  Try a sample article in one click:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SAMPLE_ARTICLES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSelectSample(sample.text)}
                      className="text-left bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-4 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {sample.label}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                      </div>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {sample.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Loading State */}
            {isLoading && (
              <section
                aria-live="polite"
                className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3"
              >
                <Loader2 className="w-7 h-7 text-blue-700 animate-spin" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Checking facts and mapping claim connections
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Separating opinions from facts, verifying against web sources, and running the trained decision model.
                  </p>
                </div>
              </section>
            )}

            {/* Analysis Result */}
            {!isLoading && result && (
              <div ref={resultsRef} className="scroll-mt-20">
                <AnalysisResult result={result} />
              </div>
            )}

            {/* Recent Checks History (persisted on server) */}
            {history.length > 0 && (
              <section className="pt-4 border-t border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Clock className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    Recent Checks
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleClearHistory()}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Clear history
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {history.map((item) => {
                    const verdictLabel =
                      item.result.verdict === 'LIKELY_REAL'
                        ? 'Likely Real'
                        : item.result.verdict === 'LIKELY_FAKE'
                          ? 'Likely Fake'
                          : 'Mixed';
                    const verdictColor =
                      item.result.verdict === 'LIKELY_REAL'
                        ? 'text-emerald-700'
                        : item.result.verdict === 'LIKELY_FAKE'
                          ? 'text-red-700'
                          : 'text-amber-700';

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (/^https?:\/\//i.test(item.fullText)) {
                            setInputMode('url');
                            setArticleUrl(item.fullText);
                          } else {
                            setInputMode('text');
                            setArticleText(item.fullText);
                          }
                          setResult(item.result);
                          setError(null);
                          setTimeout(() => {
                            resultsRef.current?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                          }, 50);
                        }}
                        className="text-left bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                          <span className={`font-semibold ${verdictColor}`}>
                            {verdictLabel} · {item.result.confidence}%
                          </span>
                          <span className="text-slate-400">{item.checkedAt}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-700 line-clamp-1">
                          {item.snippet}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkSuite
            customFacts={customFacts.map((f) => f.statement)}
            onInspectResult={handleInspectBenchmarkResult}
          />
        )}

        {activeTab === 'model' && <ModelTrainingPanel />}

        {activeTab === 'facts' && (
          <CustomFactsPanel
            facts={customFacts}
            onAddFact={(statement) => void handleAddFact(statement)}
            onRemoveFact={(id) => void handleRemoveFact(id)}
          />
        )}

        {activeTab === 'how-it-works' && (
          <section className="flex flex-col gap-6 max-w-4xl">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                How ClaimCheck works
              </h1>
              <p className="text-base text-slate-600 mt-1.5">
                Built on propositional logic, graph theory, and a trained decision classifier—kept simple for everyday readers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-mono font-medium text-blue-700">
                  01. Separate
                </div>
                <h2 className="mt-1.5 text-base font-semibold text-slate-900">
                  Facts vs. Opinions
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Paste text or a public article link. Personal opinions are set aside so only checkable facts are tested for truth.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-mono font-medium text-blue-700">
                  02. Verify
                </div>
                <h2 className="mt-1.5 text-base font-semibold text-slate-900">
                  Logic & Trained Model
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Claims are verified against web sources and your fact list, then scored by our trained Logistic Regression classifier.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-mono font-medium text-blue-700">
                  03. Map
                </div>
                <h2 className="mt-1.5 text-base font-semibold text-slate-900">
                  Visual Claim Graph
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Green lines show claims that back each other up. Red dashed lines highlight contradictions that signal unreliable news.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Ready to try it yourself?
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Check an article, inspect the trained model weights, or run the 20-article benchmark.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('checker')}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  Check an Article
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('benchmark')}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Run 20-Article Test
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>ClaimCheck — Propositional Logic & Graph Theory Fact Checker</span>
          <span>Always review primary sources for critical decisions.</span>
        </div>
      </footer>
    </div>
  );
}
