import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import type { TrainedModelSummary } from '../types.ts';

export function ModelTrainingPanel() {
  const [summary, setSummary] = useState<TrainedModelSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadModel = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/model');
      if (!res.ok) throw new Error('Could not load model details.');
      const data = (await res.json()) as TrainedModelSummary;
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadModel();
  }, []);

  const handleAction = async (endpoint: '/api/model/retrain' | '/api/model/reset', successMsg: string) => {
    setIsBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error('Model training failed.');
      const data = (await res.json()) as TrainedModelSummary;
      setSummary(data);
      setMessage(successMsg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 flex items-center justify-center gap-2.5 text-sm text-slate-600">
        <Loader2 className="w-4 h-4 animate-spin text-blue-700" aria-hidden="true" />
        Loading trained decision model...
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-800">
        {error || 'Unable to load model.'}
      </div>
    );
  }

  const maxAbsWeight = Math.max(
    1,
    ...summary.weights.map((w) => Math.abs(w.weight)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Trained Decision Model
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 leading-relaxed">
            Instead of rote-memorizing headlines or words, ClaimCheck trains a Logistic Regression model on 8 structural logic and graph signals so it can decide on brand-new articles on its own.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isBusy}
            onClick={() =>
              void handleAction(
                '/api/model/retrain',
                'Model retrained cleanly using gradient descent.',
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw
              className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Retrain Model
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() =>
              void handleAction(
                '/api/model/reset',
                'Model reset to base training corpus and retrained.',
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      {message && (
        <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
          {message}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Key Model Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Training Accuracy</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {summary.trainingAccuracy}%
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Training Examples</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {summary.sampleCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Gradient Passes</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {summary.epochs}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Learned Bias</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {summary.bias >= 0 ? `+${summary.bias}` : summary.bias}
          </div>
        </div>
      </div>

      {/* Learned Feature Weights */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            What the Model Learned
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Positive weights push the decision toward Likely Real; negative weights push toward Likely Fake. You can also teach the model after checking any article using the feedback buttons below its verdict.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th className="py-2.5 px-4">Logic / Graph Signal</th>
                <th className="py-2.5 px-4">Direction</th>
                <th className="py-2.5 px-4 text-right">Learned Weight</th>
                <th className="py-2.5 px-4 w-44">Influence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.weights.map((item) => {
                const widthPercent = Math.max(
                  6,
                  Math.round((Math.abs(item.weight) / maxAbsWeight) * 100),
                );
                const isPositive = item.weight >= 0;

                return (
                  <tr key={item.key} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {item.label}
                    </td>
                    <td
                      className={`py-3 px-4 text-xs font-medium whitespace-nowrap ${
                        isPositive ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {isPositive ? 'Supports Real' : 'Signals Fake'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-800">
                      {item.weight >= 0 ? `+${item.weight.toFixed(3)}` : item.weight.toFixed(3)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isPositive ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
