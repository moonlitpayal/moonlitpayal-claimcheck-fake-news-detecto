import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Loader2,
  Play,
  RotateCcw,
  Square,
  XCircle,
} from 'lucide-react';
import { BENCHMARK_ARTICLES } from '../data/benchmarkArticles.ts';
import type { AnalysisResponse, BenchmarkCase } from '../types.ts';

interface BenchmarkSuiteProps {
  customFacts: string[];
  onInspectResult: (text: string, result: AnalysisResponse) => void;
}

interface CaseOutcome {
  status: 'idle' | 'running' | 'done' | 'error';
  result?: AnalysisResponse;
  error?: string;
}

function formatVerdictLabel(verdict: AnalysisResponse['verdict']) {
  if (verdict === 'LIKELY_REAL') return 'Likely Real';
  if (verdict === 'LIKELY_FAKE') return 'Likely Fake';
  return 'Mixed';
}

export function BenchmarkSuite({
  customFacts,
  onInspectResult,
}: BenchmarkSuiteProps) {
  const [outcomes, setOutcomes] = useState<Record<string, CaseOutcome>>({});
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const stopRequestedRef = useRef(false);

  const runSingleCase = async (item: BenchmarkCase): Promise<void> => {
    setOutcomes((prev) => ({
      ...prev,
      [item.id]: { status: 'running' },
    }));

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.text, customFacts }),
      });

      const data = (await response.json()) as AnalysisResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed.');
      }

      setOutcomes((prev) => ({
        ...prev,
        [item.id]: { status: 'done', result: data },
      }));
    } catch (err) {
      setOutcomes((prev) => ({
        ...prev,
        [item.id]: {
          status: 'error',
          error: err instanceof Error ? err.message : 'Request failed',
        },
      }));
    }
  };

  const handleRunAll = async () => {
    stopRequestedRef.current = false;
    setIsBatchRunning(true);

    for (const item of BENCHMARK_ARTICLES) {
      if (stopRequestedRef.current) break;
      await runSingleCase(item);
      if (stopRequestedRef.current) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    setIsBatchRunning(false);
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
    setIsBatchRunning(false);
  };

  const handleReset = () => {
    stopRequestedRef.current = true;
    setIsBatchRunning(false);
    setOutcomes({});
  };

  const completedCases = BENCHMARK_ARTICLES.filter(
    (c) => outcomes[c.id]?.status === 'done' && outcomes[c.id]?.result,
  );
  const passedCount = completedCases.filter(
    (c) => outcomes[c.id]?.result?.verdict === c.expected,
  ).length;
  const accuracyPercent =
    completedCases.length > 0
      ? Math.round((passedCount / completedCases.length) * 100)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            20-Article Accuracy Test
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600">
            Test ClaimCheck against 10 real news stories and 10 false stories to measure overall accuracy.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isBatchRunning ? (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              Stop Test
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleRunAll()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              Run All 20 Tests
            </button>
          )}

          {Object.keys(outcomes).length > 0 && !isBatchRunning && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Articles Tested</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {completedCases.length} / {BENCHMARK_ARTICLES.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Matched Expected</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {passedCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Current Accuracy</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {accuracyPercent !== null ? `${accuracyPercent}%` : '—'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Project Goal</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">70%+</div>
        </div>
      </div>

      {/* Clean Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Test Article</th>
                <th className="py-3 px-4">Expected</th>
                <th className="py-3 px-4">Detected</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {BENCHMARK_ARTICLES.map((item, idx) => {
                const outcome = outcomes[item.id];
                const isRunning = outcome?.status === 'running';
                const result = outcome?.result;
                const isCorrect = result && result.verdict === item.expected;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-500 line-clamp-1 max-w-md">
                        {item.text}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs font-medium text-slate-700">
                      {formatVerdictLabel(item.expected)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs">
                      {isRunning ? (
                        <span className="inline-flex items-center gap-1.5 text-blue-700 font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          Checking...
                        </span>
                      ) : result ? (
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium tabular-nums ${
                            isCorrect ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {isCorrect ? (
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          {formatVerdictLabel(result.verdict)} ({result.confidence}%)
                        </span>
                      ) : outcome?.status === 'error' ? (
                        <span className="text-red-700">
                          Error: {outcome.error}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not tested</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {result && (
                          <button
                            type="button"
                            onClick={() => onInspectResult(item.text, result)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            View Graph
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isRunning || isBatchRunning}
                          onClick={() => void runSingleCase(item)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-md transition-colors cursor-pointer"
                        >
                          {result ? 'Re-test' : 'Test'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
