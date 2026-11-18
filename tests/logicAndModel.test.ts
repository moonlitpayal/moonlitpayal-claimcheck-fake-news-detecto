import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeLogicGraph } from '../server/logicGraphEngine.ts';
import { trainedClassifier } from '../server/mlClassifier.ts';
import {
  AnalysisCache,
  extractReadableTextFromHtml,
  SlidingWindowRateLimiter,
  validatePublicUrl,
} from '../server/securityAndCache.ts';

test('Propositional Logic Engine detects real coherent news vs fake contradicting news', () => {
  const realResult = analyzeLogicGraph(
    {
      claims: [
        {
          id: 'c1',
          shortLabel: 'It rained heavily',
          text: 'It rained heavily overnight.',
          kind: 'FACT',
          truth: 'TRUE',
          explanation: 'Weather records confirm rain.',
        },
        {
          id: 'c2',
          shortLabel: 'Roads are wet',
          text: 'City roads are wet this morning.',
          kind: 'FACT',
          truth: 'TRUE',
          explanation: 'Rain leaves roads wet.',
        },
      ],
      edges: [
        {
          sourceId: 'c1',
          targetId: 'c2',
          relation: 'SUPPORT',
          reason: 'Rainfall causes wet roads.',
        },
      ],
    },
    [],
  );

  assert.equal(realResult.verdict, 'LIKELY_REAL');
  assert.ok(realResult.confidence >= 70);

  const fakeResult = analyzeLogicGraph(
    {
      claims: [
        {
          id: 'c1',
          shortLabel: 'Vaccines contain magnets',
          text: 'Vaccines contain magnetic chips.',
          kind: 'FACT',
          truth: 'FALSE',
          explanation: 'No magnetic components exist in vaccines.',
        },
        {
          id: 'c2',
          shortLabel: 'Doctors hide chips',
          text: 'Doctors secretly hide these chips.',
          kind: 'FACT',
          truth: 'FALSE',
          explanation: 'Unsupported conspiracy claim.',
        },
      ],
      edges: [
        {
          sourceId: 'c1',
          targetId: 'c2',
          relation: 'SUPPORT',
          reason: 'Relies on false premise c1.',
        },
      ],
    },
    [],
  );

  assert.equal(fakeResult.verdict, 'LIKELY_FAKE');
  assert.ok(
    fakeResult.logicChecks.some((c) => c.ruleName === 'Broken Premise Chain'),
  );
});

test('Opinion Separation keeps subjective opinion statements from triggering Fake verdict', () => {
  const opinionOnly = analyzeLogicGraph(
    {
      claims: [
        {
          id: 'o1',
          shortLabel: 'Best movie ever',
          text: 'This is the best movie ever made.',
          kind: 'OPINION',
          truth: 'NOT_APPLICABLE',
          explanation: 'Subjective preference.',
        },
      ],
      edges: [],
    },
    [],
  );

  assert.equal(opinionOnly.verdict, 'MIXED');
  assert.equal(opinionOnly.stats.opinionCount, 1);
  assert.equal(opinionOnly.stats.factCount, 0);
});

test('Trained Logistic Regression classifier learns meaningful directional weights', () => {
  const summary = trainedClassifier.getSummary();
  assert.ok(summary.sampleCount >= 20);
  assert.ok(summary.trainingAccuracy >= 90);

  const realWeight = summary.weights.find((w) => w.key === 'trueFactRatio');
  const fakeWeight = summary.weights.find((w) => w.key === 'falseFactRatio');
  assert.ok(realWeight && realWeight.weight > 0);
  assert.ok(fakeWeight && fakeWeight.weight < 0);
});

test('SSRF guard blocks localhost and private IP addresses', () => {
  assert.equal(validatePublicUrl('http://localhost:3000/test').valid, false);
  assert.equal(validatePublicUrl('http://127.0.0.1/secret').valid, false);
  assert.equal(validatePublicUrl('http://192.168.1.10/admin').valid, false);
  assert.equal(validatePublicUrl('ftp://example.com/file').valid, false);
  assert.equal(validatePublicUrl('https://www.reuters.com/world/').valid, true);
});

test('HTML text extractor strips scripts/nav and preserves readable prose', () => {
  const html = `
    <html>
      <head><title>City Transit Update</title><script>alert(1)</script></head>
      <body>
        <nav>Home | About</nav>
        <article><p>Metro ridership rose 15 percent this month.</p></article>
      </body>
    </html>
  `;
  const text = extractReadableTextFromHtml(html);
  assert.ok(text.includes('City Transit Update'));
  assert.ok(text.includes('Metro ridership rose 15 percent this month.'));
  assert.ok(!text.includes('alert(1)'));
  assert.ok(!text.includes('Home | About'));
});

test('Cache and rate limiter behave deterministically', () => {
  const cache = new AnalysisCache(10, 60_000);
  const k1 = cache.buildKey('Article A', ['Fact 1'], 't1');
  const k2 = cache.buildKey('Article A', ['Fact 2'], 't1');
  assert.notEqual(k1, k2);

  const limiter = new SlidingWindowRateLimiter(2, 60_000);
  assert.equal(limiter.allow('1.2.3.4').allowed, true);
  assert.equal(limiter.allow('1.2.3.4').allowed, true);
  assert.equal(limiter.allow('1.2.3.4').allowed, false);
});
