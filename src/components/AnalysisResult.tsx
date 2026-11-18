import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  MessageSquareQuote,
  XCircle,
} from 'lucide-react';
import type { AnalysisResponse, ExtractedClaim } from '../types.ts';
import { ClaimGraph } from './ClaimGraph.tsx';

interface AnalysisResultProps {
  result: AnalysisResponse;
}

function getVerdictTheme(verdict: AnalysisResponse['verdict']) {
  if (verdict === 'LIKELY_REAL') {
    return {
      label: 'Likely Real',
      containerClass: 'bg-emerald-50/70 border-emerald-200',
      textClass: 'text-emerald-900',
      subClass: 'text-emerald-800',
      Icon: CheckCircle2,
      iconClass: 'text-emerald-700',
    };
  }
  if (verdict === 'LIKELY_FAKE') {
    return {
      label: 'Likely Fake',
      containerClass: 'bg-red-50/70 border-red-200',
      textClass: 'text-red-900',
      subClass: 'text-red-800',
      Icon: XCircle,
      iconClass: 'text-red-700',
    };
  }
  return {
    label: 'Mixed / Needs Context',
    containerClass: 'bg-amber-50/70 border-amber-200',
    textClass: 'text-amber-900',
    subClass: 'text-amber-800',
    Icon: AlertTriangle,
    iconClass: 'text-amber-700',
  };
}

function getClaimStatusMeta(claim: ExtractedClaim) {
  if (claim.kind === 'OPINION') {
    return {
      kindText: 'Opinion',
      truthText: 'Personal view (not fact-checked)',
      colorClass: 'text-slate-600',
      Icon: MessageSquareQuote,
    };
  }
  if (claim.truth === 'TRUE') {
    return {
      kindText: 'Fact',
      truthText: 'Matches evidence',
      colorClass: 'text-emerald-700',
      Icon: CheckCircle2,
    };
  }
  if (claim.truth === 'FALSE') {
    return {
      kindText: 'Fact',
      truthText: 'Contradicts known facts',
      colorClass: 'text-red-700',
      Icon: XCircle,
    };
  }
  return {
    kindText: 'Fact',
    truthText: 'Could not verify',
    colorClass: 'text-amber-700',
    Icon: HelpCircle,
  };
}

export function AnalysisResult({ result }: AnalysisResultProps) {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showLogicDetails, setShowLogicDetails] = useState(false);
  const [teachStatus, setTeachStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [taughtLabel, setTaughtLabel] = useState<'REAL' | 'FAKE' | null>(null);

  const theme = getVerdictTheme(result.verdict);
  const VerdictIcon = theme.Icon;

  const handleTeachModel = async (expected: 'REAL' | 'FAKE') => {
    if (!result.features) return;
    setTeachStatus('saving');
    try {
      const res = await fetch('/api/model/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: result.claims[0]?.shortLabel || 'Checked article',
          expected,
          features: result.features,
        }),
      });
      if (!res.ok) throw new Error('Failed to teach model');
      setTaughtLabel(expected);
      setTeachStatus('saved');
    } catch {
      setTeachStatus('error');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Plain-English Verdict Summary */}
      <section
        aria-label="Verification result"
        className={`border rounded-xl p-6 ${theme.containerClass}`}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <VerdictIcon
              className={`w-7 h-7 mt-0.5 shrink-0 ${theme.iconClass}`}
              aria-hidden="true"
            />
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className={`text-2xl font-bold tracking-tight ${theme.textClass}`}>
                  {theme.label}
                </h2>
                <span className={`text-sm font-medium tabular-nums ${theme.subClass}`}>
                  {result.confidence}% confidence
                </span>
              </div>
              <p className={`mt-1 text-base ${theme.subClass}`}>
                {result.headlineSummary}
              </p>
              {result.checkedSourceUrl && (
                <a
                  href={result.checkedSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 hover:underline break-all"
                >
                  Checked link: {result.checkedSourceUrl}
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-700 tabular-nums shrink-0 md:pt-1">
            <span>{result.stats.factCount} facts</span>
            <span aria-hidden="true">·</span>
            <span>{result.stats.opinionCount} opinions</span>
            <span aria-hidden="true">·</span>
            <span>{result.stats.coherencePercent}% logic flow</span>
          </div>
        </div>

        {result.reasons.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-900/10">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Why we reached this result
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-slate-800 list-disc pl-5">
              {result.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {result.features && (
          <div className="mt-4 pt-3 border-t border-slate-900/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
            <span>Was this verdict accurate? Teach the model:</span>
            {teachStatus === 'saved' ? (
              <span className="font-medium text-emerald-800">
                Saved as {taughtLabel === 'REAL' ? 'Real' : 'Fake'} and model retrained.
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={teachStatus === 'saving'}
                  onClick={() => void handleTeachModel('REAL')}
                  className="px-2.5 py-1 font-medium text-emerald-800 bg-white/80 hover:bg-white border border-emerald-300 rounded-md transition-colors cursor-pointer"
                >
                  Confirm Real
                </button>
                <button
                  type="button"
                  disabled={teachStatus === 'saving'}
                  onClick={() => void handleTeachModel('FAKE')}
                  className="px-2.5 py-1 font-medium text-red-800 bg-white/80 hover:bg-white border border-red-300 rounded-md transition-colors cursor-pointer"
                >
                  Confirm Fake
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. Two-Column Visual Graph + Claim Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <ClaimGraph
            claims={result.claims}
            edges={result.edges}
            stats={result.stats}
            selectedClaimId={selectedClaimId}
            onSelectClaim={setSelectedClaimId}
          />
        </div>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Statements Checked
            </h3>
            <p className="text-sm text-slate-600">
              Facts are verified; personal opinions are separated automatically.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {result.claims.map((claim) => {
              const meta = getClaimStatusMeta(claim);
              const StatusIcon = meta.Icon;
              const isSelected = selectedClaimId === claim.id;

              return (
                <button
                  key={claim.id}
                  type="button"
                  onClick={() =>
                    setSelectedClaimId(isSelected ? null : claim.id)
                  }
                  className={`w-full text-left py-3.5 px-3 -mx-3 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <StatusIcon
                      className={`w-3.5 h-3.5 shrink-0 ${meta.colorClass}`}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-slate-500">
                      {claim.symbol}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="text-slate-700">{meta.kindText}</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className={meta.colorClass}>{meta.truthText}</span>
                  </div>

                  <p className="mt-1 text-sm font-medium text-slate-900 leading-snug">
                    {claim.text}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {claim.explanation}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* 3. Sources Checked (from Google Search Grounding) */}
      {result.sources.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Sources Checked
          </h3>
          <p className="text-xs text-slate-600 mt-0.5 mb-3">
            Public web references consulted while verifying factual statements.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {result.sources.map((src, idx) => (
              <a
                key={idx}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-slate-700 hover:text-blue-700 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <span className="truncate font-medium">{src.title}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 4. Optional Expandable Propositional Logic & Graph Details */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLogicDetails((prev) => !prev)}
          aria-expanded={showLogicDetails}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Propositional Logic & Graph Details
            </h3>
            <p className="text-xs text-slate-600">
              Optional view of the Boolean rules and graph counts behind this score.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 whitespace-nowrap shrink-0">
            {showLogicDetails ? (
              <>
                Hide details
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              </>
            ) : (
              <>
                View details
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </span>
        </button>

        {showLogicDetails && (
          <div className="px-5 pb-5 pt-2 border-t border-slate-100 flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm tabular-nums">
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-xs text-slate-500">True Facts</div>
                <div className="text-lg font-semibold text-emerald-700 mt-0.5">
                  {result.stats.trueFactCount}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-xs text-slate-500">False Facts</div>
                <div className="text-lg font-semibold text-red-700 mt-0.5">
                  {result.stats.falseFactCount}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-xs text-slate-500">Green Support Edges</div>
                <div className="text-lg font-semibold text-emerald-700 mt-0.5">
                  {result.stats.supportEdges}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-xs text-slate-500">Red Conflict Edges</div>
                <div className="text-lg font-semibold text-red-700 mt-0.5">
                  {result.stats.contradictEdges}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Rule</th>
                    <th className="py-2.5 px-3 font-semibold">Logic Expression</th>
                    <th className="py-2.5 px-3 font-semibold">Outcome</th>
                    <th className="py-2.5 px-3 font-semibold">Plain Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.logicChecks.map((check) => (
                    <tr key={check.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {check.ruleName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {check.formula}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium">
                        <span
                          className={
                            check.status === 'PASSED'
                              ? 'text-emerald-700'
                              : check.status === 'FAILED'
                                ? 'text-red-700'
                                : 'text-amber-700'
                          }
                        >
                          {check.status === 'PASSED'
                            ? 'Passed'
                            : check.status === 'FAILED'
                              ? 'Failed'
                              : 'Caution'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {check.plainSummary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
