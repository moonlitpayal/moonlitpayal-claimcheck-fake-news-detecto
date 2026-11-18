import fs from 'fs';
import path from 'path';
import type {
  LearnedWeightItem,
  ModelFeatureVector,
  TrainedModelSummary,
} from '../src/types.ts';

interface TrainingSample {
  id: string;
  label: string;
  y: 1 | 0; // 1 = Real, 0 = Fake
  features: ModelFeatureVector;
}

interface PersistedModelState {
  weights: number[];
  bias: number;
  epochs: number;
  trainingAccuracy: number;
  lastTrainedAt: string;
  userSamples: TrainingSample[];
}

const FEATURE_KEYS: Array<{ key: keyof ModelFeatureVector; label: string }> = [
  { key: 'trueFactRatio', label: 'Verified True Facts Ratio' },
  { key: 'falseFactRatio', label: 'False Facts Ratio' },
  { key: 'unverifiedFactRatio', label: 'Unverified Facts Ratio' },
  { key: 'supportEdgeRatio', label: 'Green Support Links Ratio' },
  { key: 'contradictEdgeRatio', label: 'Red Contradiction Links Ratio' },
  { key: 'jumpEdgeRatio', label: 'Logical Jump Links Ratio' },
  { key: 'brokenChainRatio', label: 'Broken If-Then Chains Ratio' },
  { key: 'graphCohesion', label: 'Claim Graph Connectedness' },
];

// Structural Propositional-Logic & Graph-Theory Training Corpus (never memorizes words/text)
const BASE_TRAINING_CORPUS: TrainingSample[] = [
  // Real news structural patterns (y = 1)
  {
    id: 'base-r1',
    label: 'Fully verified connected report',
    y: 1,
    features: { trueFactRatio: 1.0, falseFactRatio: 0.0, unverifiedFactRatio: 0.0, supportEdgeRatio: 1.0, contradictEdgeRatio: 0.0, jumpEdgeRatio: 0.0, brokenChainRatio: 0.0, graphCohesion: 1.0 },
  },
  {
    id: 'base-r2',
    label: 'Strong verified report with emerging detail',
    y: 1,
    features: { trueFactRatio: 0.75, falseFactRatio: 0.0, unverifiedFactRatio: 0.25, supportEdgeRatio: 0.85, contradictEdgeRatio: 0.0, jumpEdgeRatio: 0.15, brokenChainRatio: 0.0, graphCohesion: 0.9 },
  },
  {
    id: 'base-r3',
    label: 'Breaking verified news with sparse links',
    y: 1,
    features: { trueFactRatio: 0.8, falseFactRatio: 0.0, unverifiedFactRatio: 0.2, supportEdgeRatio: 0.67, contradictEdgeRatio: 0.0, jumpEdgeRatio: 0.33, brokenChainRatio: 0.0, graphCohesion: 0.75 },
  },
  {
    id: 'base-r4',
    label: 'Fact + opinion editorial (verified facts)',
    y: 1,
    features: { trueFactRatio: 1.0, falseFactRatio: 0.0, unverifiedFactRatio: 0.0, supportEdgeRatio: 0.7, contradictEdgeRatio: 0.0, jumpEdgeRatio: 0.3, brokenChainRatio: 0.0, graphCohesion: 0.65 },
  },
  {
    id: 'base-r5',
    label: 'Multi-claim science reporting',
    y: 1,
    features: { trueFactRatio: 0.85, falseFactRatio: 0.0, unverifiedFactRatio: 0.15, supportEdgeRatio: 1.0, contradictEdgeRatio: 0.0, jumpEdgeRatio: 0.0, brokenChainRatio: 0.0, graphCohesion: 1.0 },
  },
  {
    id: 'base-r6',
    label: 'Local civic report with 1 unconfirmed claim',
    y: 1,
    features: { trueFactRatio: 0.67, falseFactRatio: 0.0, unverifiedFactRatio: 0.33, supportEdgeRatio: 1.0, contradictEdgeRatio: 0.0, jumpEdgeRatio: 0.0, brokenChainRatio: 0.0, graphCohesion: 0.8 },
  },
  {
    id: 'base-r7',
    label: 'Emerging factual story (mostly true, low links)',
    y: 1,
    features: { trueFactRatio: 0.6, falseFactRatio: 0.0, unverifiedFactRatio: 0.4, supportEdgeRatio: 0.75, contradictEdgeRatio: 0.0, jumpEdgeRatio: 0.25, brokenChainRatio: 0.0, graphCohesion: 0.7 },
  },
  {
    id: 'base-r8',
    label: 'Short factual brief (2 true claims, 1 support)',
    y: 1,
    features: { trueFactRatio: 1.0, falseFactRatio: 0.0, unverifiedFactRatio: 0.0, supportEdgeRatio: 1.0, contradictEdgeRatio: 0.0, jumpEdgeRatio: 0.0, brokenChainRatio: 0.0, graphCohesion: 0.5 },
  },
  {
    id: 'base-r9',
    label: 'Complex report with 1 minor nuance gap',
    y: 1,
    features: { trueFactRatio: 0.75, falseFactRatio: 0.0, unverifiedFactRatio: 0.25, supportEdgeRatio: 0.8, contradictEdgeRatio: 0.0, jumpEdgeRatio: 0.2, brokenChainRatio: 0.0, graphCohesion: 0.85 },
  },
  {
    id: 'base-r10',
    label: 'Investigative story with strong supporting web',
    y: 1,
    features: { trueFactRatio: 0.9, falseFactRatio: 0.0, unverifiedFactRatio: 0.1, supportEdgeRatio: 0.9, contradictEdgeRatio: 0.0, jumpEdgeRatio: 0.1, brokenChainRatio: 0.0, graphCohesion: 0.95 },
  },

  // Fake news structural patterns (y = 0)
  {
    id: 'base-f1',
    label: 'Blatant hoax (all false, logical jumps)',
    y: 0,
    features: { trueFactRatio: 0.0, falseFactRatio: 1.0, unverifiedFactRatio: 0.0, supportEdgeRatio: 0.0, contradictEdgeRatio: 0.0, jumpEdgeRatio: 1.0, brokenChainRatio: 0.0, graphCohesion: 0.5 },
  },
  {
    id: 'base-f2',
    label: 'Conspiracy chain (false premise -> conclusion)',
    y: 0,
    features: { trueFactRatio: 0.0, falseFactRatio: 1.0, unverifiedFactRatio: 0.0, supportEdgeRatio: 0.5, contradictEdgeRatio: 0.0, jumpEdgeRatio: 0.5, brokenChainRatio: 0.5, graphCohesion: 0.67 },
  },
  {
    id: 'base-f3',
    label: 'Self-contradicting fabrication',
    y: 0,
    features: { trueFactRatio: 0.2, falseFactRatio: 0.6, unverifiedFactRatio: 0.2, supportEdgeRatio: 0.0, contradictEdgeRatio: 0.8, jumpEdgeRatio: 0.2, brokenChainRatio: 0.3, graphCohesion: 0.4 },
  },
  {
    id: 'base-f4',
    label: 'Disguised misinformation (1 true bait + 2 false claims)',
    y: 0,
    features: { trueFactRatio: 0.33, falseFactRatio: 0.67, unverifiedFactRatio: 0.0, supportEdgeRatio: 0.33, contradictEdgeRatio: 0.33, jumpEdgeRatio: 0.34, brokenChainRatio: 0.33, graphCohesion: 0.6 },
  },
  {
    id: 'base-f5',
    label: 'Pseudoscience chain with broken premises',
    y: 0,
    features: { trueFactRatio: 0.0, falseFactRatio: 0.75, unverifiedFactRatio: 0.25, supportEdgeRatio: 0.33, contradictEdgeRatio: 0.33, jumpEdgeRatio: 0.34, brokenChainRatio: 0.67, graphCohesion: 0.5 },
  },
  {
    id: 'base-f6',
    label: 'Fabricated weather / geography hoax',
    y: 0,
    features: { trueFactRatio: 0.0, falseFactRatio: 1.0, unverifiedFactRatio: 0.0, supportEdgeRatio: 0.3, contradictEdgeRatio: 0.4, jumpEdgeRatio: 0.3, brokenChainRatio: 0.4, graphCohesion: 0.4 },
  },
  {
    id: 'base-f7',
    label: 'False health cure with unverified conspiracy',
    y: 0,
    features: { trueFactRatio: 0.0, falseFactRatio: 0.67, unverifiedFactRatio: 0.33, supportEdgeRatio: 0.0, contradictEdgeRatio: 0.5, jumpEdgeRatio: 0.5, brokenChainRatio: 0.5, graphCohesion: 0.33 },
  },
  {
    id: 'base-f8',
    label: 'Half-truth manipulated headline',
    y: 0,
    features: { trueFactRatio: 0.25, falseFactRatio: 0.5, unverifiedFactRatio: 0.25, supportEdgeRatio: 0.25, contradictEdgeRatio: 0.5, jumpEdgeRatio: 0.25, brokenChainRatio: 0.25, graphCohesion: 0.45 },
  },
  {
    id: 'base-f9',
    label: 'Contradictory rumor mill',
    y: 0,
    features: { trueFactRatio: 0.0, falseFactRatio: 0.5, unverifiedFactRatio: 0.5, supportEdgeRatio: 0.0, contradictEdgeRatio: 0.67, jumpEdgeRatio: 0.33, brokenChainRatio: 0.33, graphCohesion: 0.3 },
  },
  {
    id: 'base-f10',
    label: 'False quote + illogical jump',
    y: 0,
    features: { trueFactRatio: 0.2, falseFactRatio: 0.6, unverifiedFactRatio: 0.2, supportEdgeRatio: 0.2, contradictEdgeRatio: 0.2, jumpEdgeRatio: 0.6, brokenChainRatio: 0.4, graphCohesion: 0.4 },
  },
];

const MODEL_FILE_PATH = path.resolve(process.cwd(), 'server', 'trained_model.json');

function sigmoid(z: number): number {
  const clamped = Math.max(-20, Math.min(20, z));
  return 1 / (1 + Math.exp(-clamped));
}

function toArray(f: ModelFeatureVector): number[] {
  return FEATURE_KEYS.map((item) => f[item.key]);
}

function trainLogisticRegression(
  samples: TrainingSample[],
  epochs = 500,
  learningRate = 0.45,
  l2Lambda = 0.01,
): { weights: number[]; bias: number; accuracy: number } {
  const dim = FEATURE_KEYS.length;
  const weights = new Array<number>(dim).fill(0);
  let bias = 0;
  const n = samples.length;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Array<number>(dim).fill(0);
    let gradB = 0;

    for (const sample of samples) {
      const x = toArray(sample.features);
      let z = bias;
      for (let j = 0; j < dim; j++) {
        z += weights[j] * x[j];
      }
      const pred = sigmoid(z);
      const err = pred - sample.y;
      gradB += err;
      for (let j = 0; j < dim; j++) {
        gradW[j] += err * x[j];
      }
    }

    bias -= (learningRate * gradB) / n;
    for (let j = 0; j < dim; j++) {
      weights[j] -= learningRate * (gradW[j] / n + l2Lambda * weights[j]);
    }
  }

  let correct = 0;
  for (const sample of samples) {
    const x = toArray(sample.features);
    let z = bias;
    for (let j = 0; j < dim; j++) {
      z += weights[j] * x[j];
    }
    const predictedLabel = sigmoid(z) >= 0.5 ? 1 : 0;
    if (predictedLabel === sample.y) correct++;
  }

  const accuracy = Math.round((correct / n) * 100);
  return { weights, bias, accuracy };
}

class LogicGraphClassifier {
  private state: PersistedModelState;

  constructor() {
    this.state = this.loadOrTrainInitial();
  }

  private loadOrTrainInitial(): PersistedModelState {
    try {
      if (fs.existsSync(MODEL_FILE_PATH)) {
        const raw = fs.readFileSync(MODEL_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as PersistedModelState;
        if (
          Array.isArray(parsed.weights) &&
          parsed.weights.length === FEATURE_KEYS.length &&
          typeof parsed.bias === 'number'
        ) {
          return parsed;
        }
      }
    } catch {
      // Fall back to fresh training
    }
    return this.retrain([]);
  }

  private persist() {
    try {
      fs.writeFileSync(MODEL_FILE_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not persist trained model file:', err);
    }
  }

  retrain(userSamples?: TrainingSample[]): PersistedModelState {
    const extraSamples = userSamples ?? this.state?.userSamples ?? [];
    const allSamples = [...BASE_TRAINING_CORPUS, ...extraSamples];
    const epochs = 500;
    const { weights, bias, accuracy } = trainLogisticRegression(allSamples, epochs);

    this.state = {
      weights,
      bias,
      epochs,
      trainingAccuracy: accuracy,
      lastTrainedAt: new Date().toISOString(),
      userSamples: extraSamples,
    };
    this.persist();
    return this.state;
  }

  addSampleAndRetrain(
    label: string,
    expected: 'REAL' | 'FAKE',
    features: ModelFeatureVector,
  ): TrainedModelSummary {
    const nextSamples = [
      ...this.state.userSamples,
      {
        id: `user-${Date.now()}`,
        label: label.slice(0, 80),
        y: expected === 'REAL' ? (1 as const) : (0 as const),
        features,
      },
    ].slice(-40);

    this.retrain(nextSamples);
    return this.getSummary();
  }

  resetToBaseAndRetrain(): TrainedModelSummary {
    this.retrain([]);
    return this.getSummary();
  }

  predictRealProbability(features: ModelFeatureVector): number {
    const x = toArray(features);
    let z = this.state.bias;
    for (let j = 0; j < FEATURE_KEYS.length; j++) {
      z += this.state.weights[j] * x[j];
    }
    return sigmoid(z);
  }

  getSummary(): TrainedModelSummary {
    const weights: LearnedWeightItem[] = FEATURE_KEYS.map((meta, idx) => {
      const w = Number(this.state.weights[idx].toFixed(3));
      return {
        key: meta.key,
        label: meta.label,
        weight: w,
        effect: w >= 0 ? 'PUSHES_REAL' : 'PUSHES_FAKE',
      };
    });

    return {
      algorithm: 'L2 Logistic Regression (Gradient Descent on Graph & Logic Features)',
      sampleCount: BASE_TRAINING_CORPUS.length + this.state.userSamples.length,
      epochs: this.state.epochs,
      trainingAccuracy: this.state.trainingAccuracy,
      bias: Number(this.state.bias.toFixed(3)),
      lastTrainedAt: this.state.lastTrainedAt,
      weights,
    };
  }
}

export const trainedClassifier = new LogicGraphClassifier();
