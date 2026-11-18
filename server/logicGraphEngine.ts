import type {
  AnalysisResponse,
  ClaimEdge,
  ExtractedClaim,
  GraphStats,
  GroundingSource,
  LogicCheckItem,
  ModelFeatureVector,
  OverallVerdict,
} from '../src/types.ts';
import { trainedClassifier } from './mlClassifier.ts';

export interface RawExtractionInput {
  claims: Array<{
    id: string;
    shortLabel: string;
    text: string;
    kind: 'FACT' | 'OPINION';
    truth: 'TRUE' | 'FALSE' | 'UNVERIFIED' | 'NOT_APPLICABLE';
    explanation: string;
  }>;
  edges: Array<{
    sourceId: string;
    targetId: string;
    relation: 'SUPPORT' | 'CONTRADICT' | 'JUMP';
    reason: string;
  }>;
}

export function analyzeLogicGraph(
  raw: RawExtractionInput,
  sources: GroundingSource[],
): AnalysisResponse {
  const claims: ExtractedClaim[] = raw.claims.map((c, idx) => ({
    id: c.id || `c${idx + 1}`,
    symbol: `P${idx + 1}`,
    shortLabel: c.shortLabel.trim(),
    text: c.text.trim(),
    kind: c.kind === 'OPINION' ? 'OPINION' : 'FACT',
    truth:
      c.kind === 'OPINION'
        ? 'NOT_APPLICABLE'
        : c.truth === 'TRUE' || c.truth === 'FALSE' || c.truth === 'UNVERIFIED'
          ? c.truth
          : 'UNVERIFIED',
    explanation: c.explanation.trim(),
  }));

  const claimById = new Map(claims.map((c) => [c.id, c]));

  const edges: ClaimEdge[] = raw.edges
    .filter(
      (e) =>
        e.sourceId !== e.targetId &&
        claimById.has(e.sourceId) &&
        claimById.has(e.targetId),
    )
    .map((e, idx) => ({
      id: `e${idx + 1}`,
      sourceId: e.sourceId,
      targetId: e.targetId,
      relation:
        e.relation === 'SUPPORT' ||
        e.relation === 'CONTRADICT' ||
        e.relation === 'JUMP'
          ? e.relation
          : 'JUMP',
      reason: e.reason.trim(),
    }));

  const factClaims = claims.filter((c) => c.kind === 'FACT');
  const opinionClaims = claims.filter((c) => c.kind === 'OPINION');
  const trueFactCount = factClaims.filter((c) => c.truth === 'TRUE').length;
  const falseFactCount = factClaims.filter((c) => c.truth === 'FALSE').length;
  const unverifiedFactCount = factClaims.filter(
    (c) => c.truth === 'UNVERIFIED',
  ).length;

  const supportEdges = edges.filter((e) => e.relation === 'SUPPORT').length;
  const contradictEdges = edges.filter((e) => e.relation === 'CONTRADICT').length;
  const jumpEdges = edges.filter((e) => e.relation === 'JUMP').length;

  const logicChecks: LogicCheckItem[] = [];

  if (opinionClaims.length > 0) {
    logicChecks.push({
      id: 'logic-opinion-filter',
      formula: `${opinionClaims.map((o) => o.symbol).join(', ')} ∉ FactSet`,
      ruleName: 'Opinion Separation',
      status: 'PASSED',
      plainSummary: `Separated ${opinionClaims.length} opinion ${opinionClaims.length === 1 ? 'statement' : 'statements'} so personal views are not mislabeled as fake facts.`,
    });
  }

  for (const claim of factClaims) {
    if (claim.truth === 'FALSE') {
      logicChecks.push({
        id: `logic-false-${claim.id}`,
        formula: `${claim.symbol} = FALSE (¬${claim.symbol})`,
        ruleName: 'Fact Contradiction',
        status: 'FAILED',
        plainSummary: `"${claim.shortLabel}" conflicts with verified facts.`,
      });
    } else if (claim.truth === 'TRUE') {
      logicChecks.push({
        id: `logic-true-${claim.id}`,
        formula: `${claim.symbol} = TRUE`,
        ruleName: 'Verified Premise',
        status: 'PASSED',
        plainSummary: `"${claim.shortLabel}" aligns with reliable evidence.`,
      });
    } else {
      logicChecks.push({
        id: `logic-unverified-${claim.id}`,
        formula: `${claim.symbol} = UNKNOWN`,
        ruleName: 'Unverified Claim',
        status: 'WARNING',
        plainSummary: `"${claim.shortLabel}" could not be independently confirmed.`,
      });
    }
  }

  for (const edge of edges) {
    const src = claimById.get(edge.sourceId);
    const tgt = claimById.get(edge.targetId);
    if (!src || !tgt) continue;

    if (edge.relation === 'SUPPORT') {
      if (src.truth === 'FALSE') {
        logicChecks.push({
          id: `logic-broken-chain-${edge.id}`,
          formula: `(${src.symbol} → ${tgt.symbol}) ∧ ¬${src.symbol}`,
          ruleName: 'Broken Premise Chain',
          status: 'FAILED',
          plainSummary: `"${tgt.shortLabel}" relies on "${src.shortLabel}", which is false.`,
        });
      } else {
        logicChecks.push({
          id: `logic-support-${edge.id}`,
          formula: `${src.symbol} → ${tgt.symbol}`,
          ruleName: 'Logical Support',
          status: 'PASSED',
          plainSummary: `"${src.shortLabel}" logically supports "${tgt.shortLabel}".`,
        });
      }
    } else if (edge.relation === 'CONTRADICT') {
      logicChecks.push({
        id: `logic-contradict-${edge.id}`,
        formula: `¬(${src.symbol} ∧ ${tgt.symbol})`,
        ruleName: 'Direct Contradiction',
        status: 'FAILED',
        plainSummary: `"${src.shortLabel}" contradicts "${tgt.shortLabel}".`,
      });
    } else {
      logicChecks.push({
        id: `logic-jump-${edge.id}`,
        formula: `${src.symbol} ↛ ${tgt.symbol}`,
        ruleName: 'Unsupported Jump',
        status: 'WARNING',
        plainSummary: `Jumping from "${src.shortLabel}" to "${tgt.shortLabel}" lacks a clear logical link.`,
      });
    }
  }

  // Extract 8 Propositional-Logic & Graph-Theory features for the trained ML classifier
  const factTotal = Math.max(factClaims.length, 1);
  const totalEdges = supportEdges + contradictEdges + jumpEdges;
  const brokenChainCount = logicChecks.filter(
    (l) => l.ruleName === 'Broken Premise Chain',
  ).length;

  const connectedNodes = new Set<string>();
  for (const edge of edges) {
    if (edge.relation === 'SUPPORT') {
      connectedNodes.add(edge.sourceId);
      connectedNodes.add(edge.targetId);
    }
  }

  const features: ModelFeatureVector = {
    trueFactRatio: factClaims.length === 0 ? 0.5 : trueFactCount / factTotal,
    falseFactRatio: factClaims.length === 0 ? 0 : falseFactCount / factTotal,
    unverifiedFactRatio: factClaims.length === 0 ? 0.5 : unverifiedFactCount / factTotal,
    supportEdgeRatio: totalEdges === 0 ? 0.5 : supportEdges / totalEdges,
    contradictEdgeRatio: totalEdges === 0 ? 0 : contradictEdges / totalEdges,
    jumpEdgeRatio: totalEdges === 0 ? 0 : jumpEdges / totalEdges,
    brokenChainRatio: totalEdges === 0 ? 0 : brokenChainCount / totalEdges,
    graphCohesion:
      claims.length === 0 ? 0 : connectedNodes.size / claims.length,
  };

  // Let the trained Logistic Regression model decide P(Real | graph & logic features)
  const realProbability = trainedClassifier.predictRealProbability(features);
  const realnessScore = Math.round(realProbability * 100);

  const edgeScore =
    totalEdges === 0
      ? Math.round(features.trueFactRatio * 100)
      : Math.round(
          ((supportEdges * 1 + jumpEdges * 0.35) / totalEdges) * 100,
        );
  const coherencePercent = Math.max(0, Math.min(100, edgeScore));

  let verdict: OverallVerdict;
  let confidence: number;
  let headlineSummary: string;

  if (factClaims.length === 0) {
    verdict = 'MIXED';
    confidence = 68;
    headlineSummary =
      'This text is mostly personal opinion rather than checkable facts.';
  } else if (realProbability >= 0.65 && falseFactCount === 0) {
    verdict = 'LIKELY_REAL';
    confidence = Math.max(66, Math.min(98, realnessScore));
    headlineSummary =
      'The factual claims check out and support each other logically.';
  } else if (realProbability <= 0.38 || (falseFactCount > 0 && realProbability < 0.5)) {
    verdict = 'LIKELY_FAKE';
    confidence = Math.max(66, Math.min(98, 100 - realnessScore));
    headlineSummary =
      'Key claims contradict verified facts or clash with each other.';
  } else {
    verdict = 'MIXED';
    confidence = Math.max(52, Math.min(78, Math.round(50 + Math.abs(0.5 - realProbability) * 60)));
    headlineSummary =
      'Some parts check out, while other claims lack proof or jump to conclusions.';
  }

  const reasons: string[] = [];

  if (trueFactCount > 0) {
    reasons.push(
      `${trueFactCount} of ${factClaims.length} factual ${factClaims.length === 1 ? 'claim matches' : 'claims match'} reliable evidence.`,
    );
  }
  if (falseFactCount > 0) {
    reasons.push(
      `${falseFactCount} factual ${falseFactCount === 1 ? 'claim contradicts' : 'claims contradict'} well-established facts.`,
    );
  }
  if (unverifiedFactCount > 0) {
    reasons.push(
      `${unverifiedFactCount} ${unverifiedFactCount === 1 ? 'claim could' : 'claims could'} not be confirmed with current sources.`,
    );
  }
  if (supportEdges > 0 && contradictEdges === 0) {
    reasons.push(
      `Claims connect smoothly with ${supportEdges} supporting logical ${supportEdges === 1 ? 'link' : 'links'}.`,
    );
  } else if (contradictEdges > 0) {
    reasons.push(
      `Found ${contradictEdges} logical ${contradictEdges === 1 ? 'contradiction' : 'contradictions'} between statements.`,
    );
  }
  if (jumpEdges > 0) {
    reasons.push(
      `Detected ${jumpEdges} logical ${jumpEdges === 1 ? 'jump' : 'jumps'} where a conclusion isn't backed by earlier claims.`,
    );
  }
  if (opinionClaims.length > 0) {
    reasons.push(
      `${opinionClaims.length} opinion ${opinionClaims.length === 1 ? 'statement was' : 'statements were'} separated and not judged as false.`,
    );
  }

  const stats: GraphStats = {
    totalClaims: claims.length,
    factCount: factClaims.length,
    opinionCount: opinionClaims.length,
    trueFactCount,
    falseFactCount,
    unverifiedFactCount,
    supportEdges,
    contradictEdges,
    jumpEdges,
    coherencePercent,
  };

  return {
    verdict,
    confidence,
    headlineSummary,
    reasons: reasons.slice(0, 4),
    claims,
    edges,
    logicChecks,
    stats,
    sources,
    features,
  };
}
