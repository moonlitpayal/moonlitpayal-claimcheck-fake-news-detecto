import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CustomFact } from '../types.ts';

interface CustomFactsPanelProps {
  facts: CustomFact[];
  onAddFact: (statement: string) => void;
  onRemoveFact: (id: string) => void;
}

export function CustomFactsPanel({
  facts,
  onAddFact,
  onRemoveFact,
}: CustomFactsPanelProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed.length < 5) {
      setError('Please enter a clear short fact (at least 5 characters).');
      return;
    }
    if (trimmed.length > 300) {
      setError('Please keep each fact under 300 characters.');
      return;
    }
    onAddFact(trimmed);
    setInput('');
    setError(null);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          My Trusted Fact List
        </h1>
        <p className="mt-1.5 text-sm sm:text-base text-slate-600">
          Add verified facts you want ClaimCheck to treat as true when checking articles. Any article that contradicts a fact here will be flagged automatically.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3"
      >
        <label
          htmlFor="new-fact-input"
          className="text-sm font-semibold text-slate-900"
        >
          Add a verified fact
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            id="new-fact-input"
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Example: Mumbai does not get natural snow due to its tropical climate"
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Fact
          </button>
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </form>

      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Active Known Facts
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">
            {facts.length} saved
          </span>
        </div>

        {facts.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">
            No custom facts saved yet. ClaimCheck will still verify articles against public web sources and general scientific facts.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {facts.map((fact, idx) => (
              <li
                key={fact.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-baseline gap-3 text-sm text-slate-800">
                  <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                    F{idx + 1}
                  </span>
                  <span>{fact.statement}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFact(fact.id)}
                  aria-label={`Remove fact: ${fact.statement}`}
                  className="p-1.5 text-slate-400 hover:text-red-700 rounded-md transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
