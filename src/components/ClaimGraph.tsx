import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  MessageSquareQuote,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import type { ClaimEdge, ExtractedClaim, GraphStats } from '../types.ts';

interface ClaimGraphProps {
  claims: ExtractedClaim[];
  edges: ClaimEdge[];
  stats: GraphStats;
  selectedClaimId: string | null;
  onSelectClaim: (id: string | null) => void;
}

interface PositionedNode {
  claim: ExtractedClaim;
  x: number;
  y: number;
}

const SVG_WIDTH = 760;
const SVG_HEIGHT = 420;
const NODE_W = 166;
const NODE_H = 74;

function wrapWords(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  } else if (current && lines.length === maxLines) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length > maxCharsPerLine - 3 ? `${last.slice(0, maxCharsPerLine - 3)}...` : `${last}...`;
  }

  return lines.length > 0 ? lines : [text.slice(0, maxCharsPerLine)];
}

function getNodePalette(claim: ExtractedClaim) {
  if (claim.kind === 'OPINION') {
    return {
      fill: '#F8FAFC',
      stroke: '#94A3B8',
      accentText: '#475569',
      statusWord: 'Opinion',
    };
  }
  if (claim.truth === 'TRUE') {
    return {
      fill: '#ECFDF5',
      stroke: '#059669',
      accentText: '#065F46',
      statusWord: 'True',
    };
  }
  if (claim.truth === 'FALSE') {
    return {
      fill: '#FEF2F2',
      stroke: '#DC2626',
      accentText: '#991B1B',
      statusWord: 'False',
    };
  }
  return {
    fill: '#FFFBEB',
    stroke: '#D97706',
    accentText: '#92400E',
    statusWord: 'Unverified',
  };
}

function getEdgeStyle(relation: ClaimEdge['relation']) {
  if (relation === 'SUPPORT') {
    return {
      color: '#059669',
      dash: undefined,
      label: 'Supports',
      markerId: 'arrow-support',
    };
  }
  if (relation === 'CONTRADICT') {
    return {
      color: '#DC2626',
      dash: '7 5',
      label: 'Contradicts',
      markerId: 'arrow-contradict',
    };
  }
  return {
    color: '#D97706',
    dash: '3 4',
    label: 'Logical Jump',
    markerId: 'arrow-jump',
  };
}

export function ClaimGraph({
  claims,
  edges,
  stats,
  selectedClaimId,
  onSelectClaim,
}: ClaimGraphProps) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const nodes = useMemo<PositionedNode[]>(() => {
    const count = claims.length;
    if (count === 0) return [];

    const cx = SVG_WIDTH / 2;
    const cy = SVG_HEIGHT / 2;
    const rx = count <= 3 ? 210 : 250;
    const ry = count <= 3 ? 95 : 132;

    return claims.map((claim, idx) => {
      if (count === 1) {
        return { claim, x: cx, y: cy };
      }
      const angle = -Math.PI / 2 + (2 * Math.PI * idx) / count;
      return {
        claim,
        x: Math.round(cx + rx * Math.cos(angle)),
        y: Math.round(cy + ry * Math.sin(angle)),
      };
    });
  }, [claims]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.claim.id, n])), [nodes]);

  const activeClaim = selectedClaimId
    ? claims.find((c) => c.id === selectedClaimId) ?? null
    : null;

  const activeEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId) ?? null
    : null;

  const handleNodeClick = (id: string) => {
    setSelectedEdgeId(null);
    onSelectClaim(selectedClaimId === id ? null : id);
  };

  const handleEdgeClick = (id: string) => {
    onSelectClaim(null);
    setSelectedEdgeId(selectedEdgeId === id ? null : id);
  };

  const handleResetSelection = () => {
    setSelectedEdgeId(null);
    onSelectClaim(null);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Claim Connection Map
          </h3>
          <p className="text-sm text-slate-600">
            Click any box or line to see how statements connect.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600 tabular-nums">
          <span>{stats.supportEdges} supporting</span>
          <span aria-hidden="true">·</span>
          <span>{stats.contradictEdges} contradicting</span>
          {(selectedClaimId || selectedEdgeId) && (
            <button
              type="button"
              onClick={handleResetSelection}
              className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-800 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1.5 py-0.5 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Dual-coded Legend (Color + Line Pattern) */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <svg width="26" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="26" y2="5" stroke="#059669" strokeWidth="2.5" />
          </svg>
          <span>Supports</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="26" height="10" aria-hidden="true">
            <line
              x1="0"
              y1="5"
              x2="26"
              y2="5"
              stroke="#DC2626"
              strokeWidth="2.5"
              strokeDasharray="5 3"
            />
          </svg>
          <span>Contradicts</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="26" height="10" aria-hidden="true">
            <line
              x1="0"
              y1="5"
              x2="26"
              y2="5"
              stroke="#D97706"
              strokeWidth="2.5"
              strokeDasharray="2 3"
            />
          </svg>
          <span>Logical jump</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto bg-slate-50/70 border border-slate-200/80 rounded-lg">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto min-w-[540px] max-h-[430px] select-none"
          role="img"
          aria-label="Graph showing claims as boxes and logical relationships as connecting lines"
        >
          <defs>
            <marker
              id="arrow-support"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
            </marker>
            <marker
              id="arrow-contradict"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#DC2626" />
            </marker>
            <marker
              id="arrow-jump"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#D97706" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge, idx) => {
            const src = nodeMap.get(edge.sourceId);
            const tgt = nodeMap.get(edge.targetId);
            if (!src || !tgt) return null;

            const style = getEdgeStyle(edge.relation);
            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;

            // Trim endpoints slightly outside node center for cleaner arrow entry
            const startX = src.x + ux * 68;
            const startY = src.y + uy * 32;
            const endX = tgt.x - ux * 74;
            const endY = tgt.y - uy * 36;

            // Gentle curve offset so bidirectional or crossing edges stay readable
            const curveSign = idx % 2 === 0 ? 1 : -1;
            const midX = (startX + endX) / 2 - uy * 18 * curveSign;
            const midY = (startY + endY) / 2 + ux * 18 * curveSign;

            const isEdgeHighlighted =
              selectedEdgeId === edge.id ||
              (selectedClaimId !== null &&
                (edge.sourceId === selectedClaimId ||
                  edge.targetId === selectedClaimId));
            const isDimmed =
              (selectedClaimId !== null || selectedEdgeId !== null) &&
              !isEdgeHighlighted;

            return (
              <g
                key={edge.id}
                onClick={() => handleEdgeClick(edge.id)}
                className="cursor-pointer"
                opacity={isDimmed ? 0.25 : 1}
              >
                {/* Wider transparent hit target for effortless clicking */}
                <path
                  d={`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="16"
                />
                <path
                  d={`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`}
                  fill="none"
                  stroke={style.color}
                  strokeWidth={isEdgeHighlighted ? 3.2 : 2.2}
                  strokeDasharray={style.dash}
                  markerEnd={`url(#${style.markerId})`}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(({ claim, x, y }) => {
            const palette = getNodePalette(claim);
            const lines = wrapWords(claim.shortLabel, 21, 2);
            const isSelected = selectedClaimId === claim.id;
            const isConnectedToSelected =
              selectedClaimId !== null &&
              edges.some(
                (e) =>
                  (e.sourceId === selectedClaimId && e.targetId === claim.id) ||
                  (e.targetId === selectedClaimId && e.sourceId === claim.id),
              );
            const isConnectedToEdge =
              activeEdge !== null &&
              (activeEdge.sourceId === claim.id ||
                activeEdge.targetId === claim.id);

            const isDimmed =
              (selectedClaimId !== null &&
                !isSelected &&
                !isConnectedToSelected) ||
              (activeEdge !== null && !isConnectedToEdge);

            return (
              <g
                key={claim.id}
                transform={`translate(${x - NODE_W / 2}, ${y - NODE_H / 2})`}
                onClick={() => handleNodeClick(claim.id)}
                className="cursor-pointer"
                opacity={isDimmed ? 0.35 : 1}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx="10"
                  fill={palette.fill}
                  stroke={isSelected ? '#1D4ED8' : palette.stroke}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                <text
                  x="12"
                  y="20"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="IBM Plex Mono, monospace"
                  fill={palette.accentText}
                >
                  {claim.symbol} · {palette.statusWord}
                </text>
                {lines.map((line, i) => (
                  <text
                    key={`${claim.id}-line-${i}`}
                    x="12"
                    y={39 + i * 16}
                    fontSize="12.5"
                    fontWeight="500"
                    fontFamily="DM Sans, sans-serif"
                    fill="#0F172A"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Plain-English Inspection Bar */}
      <div className="min-h-[64px] bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-start gap-3">
        {activeClaim ? (
          <>
            <div className="mt-0.5 shrink-0">
              {activeClaim.kind === 'OPINION' ? (
                <MessageSquareQuote className="w-4 h-4 text-slate-600" aria-hidden="true" />
              ) : activeClaim.truth === 'TRUE' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              ) : activeClaim.truth === 'FALSE' ? (
                <XCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
              ) : (
                <HelpCircle className="w-4 h-4 text-amber-700" aria-hidden="true" />
              )}
            </div>
            <div className="text-sm">
              <p className="font-medium text-slate-900">
                {activeClaim.symbol}: {activeClaim.text}
              </p>
              <p className="text-slate-600 mt-0.5">{activeClaim.explanation}</p>
            </div>
          </>
        ) : activeEdge ? (
          <>
            <div className="mt-0.5 shrink-0">
              <AlertTriangle
                className={`w-4 h-4 ${
                  activeEdge.relation === 'SUPPORT'
                    ? 'text-emerald-700'
                    : activeEdge.relation === 'CONTRADICT'
                      ? 'text-red-700'
                      : 'text-amber-700'
                }`}
                aria-hidden="true"
              />
            </div>
            <div className="text-sm">
              <p className="font-medium text-slate-900">
                {getEdgeStyle(activeEdge.relation).label} connection
              </p>
              <p className="text-slate-600 mt-0.5">{activeEdge.reason}</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            Tip: Real news forms green supporting chains. Fake news often shows red contradictions or isolated claims that don't connect.
          </p>
        )}
      </div>
    </section>
  );
}
