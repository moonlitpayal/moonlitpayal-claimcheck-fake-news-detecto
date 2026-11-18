export type ClaimKind = 'FACT' | 'OPINION';

export type ClaimTruth = 'TRUE' | 'FALSE' | 'UNVERIFIED' | 'NOT_APPLICABLE';

export type EdgeRelation = 'SUPPORT' | 'CONTRADICT' | 'JUMP';

export type OverallVerdict = 'LIKELY_REAL' | 'MIXED' | 'LIKELY_FAKE';

export interface ExtractedClaim {
  id: string;
  symbol: string;
  shortLabel: string;
  text: string;
  kind: ClaimKind;
  truth: ClaimTruth;
  explanation: string;
}

export interface ClaimEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: EdgeRelation;
  reason: string;
}

export interface LogicCheckItem {
  id: string;
  formula: string;
  ruleName: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  plainSummary: string;
}

export interface GraphStats {
  totalClaims: number;
  factCount: number;
  opinionCount: number;
  trueFactCount: number;
  falseFactCount: number;
  unverifiedFactCount: number;
  supportEdges: number;
  contradictEdges: number;
  jumpEdges: number;
  coherencePercent: number;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface AnalysisResponse {
  verdict: OverallVerdict;
  confidence: number;
  headlineSummary: string;
  reasons: string[];
  claims: ExtractedClaim[];
  edges: ClaimEdge[];
  logicChecks: LogicCheckItem[];
  stats: GraphStats;
  sources: GroundingSource[];
  features?: ModelFeatureVector;
  checkedSourceUrl?: string;
  cached?: boolean;
}

export interface CustomFact {
  id: string;
  statement: string;
}

export interface HistoryEntry {
  id: string;
  snippet: string;
  fullText: string;
  checkedAt: string;
  result: AnalysisResponse;
}

export interface BenchmarkCase {
  id: string;
  title: string;
  expected: 'LIKELY_REAL' | 'LIKELY_FAKE';
  text: string;
}

export interface ModelFeatureVector {
  trueFactRatio: number;
  falseFactRatio: number;
  unverifiedFactRatio: number;
  supportEdgeRatio: number;
  contradictEdgeRatio: number;
  jumpEdgeRatio: number;
  brokenChainRatio: number;
  graphCohesion: number;
}

export interface LearnedWeightItem {
  key: keyof ModelFeatureVector;
  label: string;
  weight: number;
  effect: 'PUSHES_REAL' | 'PUSHES_FAKE';
}

export interface TrainedModelSummary {
  algorithm: string;
  sampleCount: number;
  epochs: number;
  trainingAccuracy: number;
  bias: number;
  lastTrainedAt: string;
  weights: LearnedWeightItem[];
}
