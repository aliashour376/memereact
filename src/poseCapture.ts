import { memeCategories, type MemeCategory } from './memeTypes.ts';
import type { NormalizedSignals } from './calibration.ts';

export type PoseCaptureLabel = 'good' | 'bad';

export interface PoseFeatureVector {
  names: string[];
  values: number[];
}

export interface PoseCaptureSample {
  id: string;
  category: MemeCategory;
  label: PoseCaptureLabel;
  capturedAt: string;
  features: PoseFeatureVector;
}

export interface PoseCaptureDataset {
  version: 1;
  createdAt: string;
  updatedAt: string;
  samples: PoseCaptureSample[];
}

export interface CapturedPoseScore {
  category: MemeCategory;
  score: number;
  goodSamples: number;
  badSamples: number;
  nearestGoodDistance: number;
  nearestBadDistance: number | null;
}

const nearestNeighborCount = 5;

const featureNames = [
  'facePresent',
  'handCount',
  'raisedOpenPalms',
  'headTouches',
  'thumbsUp',
  'handNearFace',
  'fingerNearMouth',
  'palmsTogetherNearFace',
  'fingerGunAtCamera',
  'leftHandPresent',
  'leftPalmX',
  'leftPalmY',
  'leftHandHeight',
  'rightHandPresent',
  'rightPalmX',
  'rightPalmY',
  'rightHandHeight',
  'mouthOpenDelta',
  'eyeOpennessDelta',
  'browFurrowDelta',
  'squintDelta',
  'faceScaleRatio',
  'lookUpDelta',
  'lookDownDelta',
  'tongueOutDelta',
  'smileDelta',
  'headTiltUpDelta',
  'headTiltDownDelta',
  'headTiltSideDelta'
] as const;

const featureWeights = [
  1.4,
  2.2,
  1.2,
  1.5,
  0.9,
  0.9,
  1,
  1.5,
  1.8,
  1,
  1.8,
  1.8,
  2.1,
  1,
  1.8,
  1.8,
  2.1,
  1,
  0.8,
  0.9,
  0.8,
  1.6,
  0.8,
  0.8,
  1,
  0.9,
  1,
  1,
  1.2
];

export function createEmptyPoseDataset(now = new Date()): PoseCaptureDataset {
  const iso = now.toISOString();
  return {
    version: 1,
    createdAt: iso,
    updatedAt: iso,
    samples: []
  };
}

export function createPoseCaptureSample(
  category: MemeCategory,
  label: PoseCaptureLabel,
  signals: NormalizedSignals,
  now = new Date()
): PoseCaptureSample {
  return {
    id: createSampleId(category, label, now),
    category,
    label,
    capturedAt: now.toISOString(),
    features: extractPoseFeatures(signals)
  };
}

export function appendPoseCaptureSamples(
  dataset: PoseCaptureDataset,
  samples: PoseCaptureSample[],
  now = new Date()
): PoseCaptureDataset {
  return {
    ...dataset,
    updatedAt: now.toISOString(),
    samples: [...dataset.samples, ...samples]
  };
}

export function removePoseCapturesForCategory(
  dataset: PoseCaptureDataset,
  category: MemeCategory,
  now = new Date()
): PoseCaptureDataset {
  return {
    ...dataset,
    updatedAt: now.toISOString(),
    samples: dataset.samples.filter((sample) => sample.category !== category)
  };
}

export function getPoseCaptureCounts(dataset: PoseCaptureDataset, category: MemeCategory) {
  const categorySamples = dataset.samples.filter((sample) => sample.category === category);
  return {
    good: categorySamples.filter((sample) => sample.label === 'good').length,
    bad: categorySamples.filter((sample) => sample.label === 'bad').length
  };
}

export function extractPoseFeatures(signals: NormalizedSignals): PoseFeatureVector {
  const handRows = signals.hands.palmCenterXRatio
    .map((palmX, index) => ({
      palmX,
      palmY: signals.hands.palmCenterYRatio[index] ?? 0,
      handHeight: signals.hands.handHeightRatio[index] ?? 0
    }))
    .sort((a, b) => a.palmX - b.palmX)
    .slice(0, 2);

  const leftHand = handRows[0] ?? null;
  const rightHand = handRows[1] ?? null;

  return {
    names: [...featureNames],
    values: [
      bool(signals.face.facePresent),
      normalizeRange(signals.hands.handCount, 0, 2),
      normalizeRange(signals.hands.raisedOpenPalms, 0, 2),
      normalizeRange(signals.hands.headTouches, 0, 2),
      bool(signals.hands.thumbsUp),
      bool(signals.hands.handNearFace),
      bool(signals.hands.fingerNearMouth),
      bool(signals.hands.palmsTogetherNearFace),
      bool(signals.hands.fingerGunAtCamera),
      bool(Boolean(leftHand)),
      normalizeRange(leftHand?.palmX ?? 0.5, -1, 2),
      normalizeRange(leftHand?.palmY ?? 0.5, -0.4, 2),
      normalizeRange(leftHand?.handHeight ?? 0, 0, 1.4),
      bool(Boolean(rightHand)),
      normalizeRange(rightHand?.palmX ?? 0.5, -1, 2),
      normalizeRange(rightHand?.palmY ?? 0.5, -0.4, 2),
      normalizeRange(rightHand?.handHeight ?? 0, 0, 1.4),
      normalizeRange(signals.face.mouthOpenDelta, 0, 0.35),
      normalizeRange(signals.face.eyeOpennessDelta, 0, 0.25),
      normalizeRange(signals.face.browFurrowDelta, 0, 0.25),
      normalizeRange(signals.face.squintDelta, 0, 0.25),
      normalizeRange(signals.face.faceScaleRatio, 0.35, 1.8),
      normalizeRange(signals.face.lookUpDelta, 0, 0.3),
      normalizeRange(signals.face.lookDownDelta, 0, 0.3),
      normalizeRange(signals.face.tongueOutDelta, 0, 0.3),
      normalizeRange(signals.face.smileDelta, 0, 0.35),
      normalizeRange(signals.face.headTiltUpDelta, 0, 0.35),
      normalizeRange(signals.face.headTiltDownDelta, 0, 0.35),
      normalizeRange(signals.face.headTiltSideDelta, 0, 0.25)
    ]
  };
}

export function scoreCapturedPose(
  dataset: PoseCaptureDataset,
  category: MemeCategory,
  signals: NormalizedSignals
): CapturedPoseScore | null {
  const liveFeatures = extractPoseFeatures(signals);
  const categorySamples = dataset.samples.filter((sample) => sample.category === category);
  const goodSamples = categorySamples.filter((sample) => sample.label === 'good');
  const badSamples = categorySamples.filter((sample) => sample.label === 'bad');

  if (goodSamples.length < 8) {
    return null;
  }

  const nearestGoodDistance = getAverageNearestDistance(
    liveFeatures,
    goodSamples.map((sample) => sample.features),
    nearestNeighborCount
  );
  const nearestBadDistance = badSamples.length > 0
    ? getAverageNearestDistance(
        liveFeatures,
        badSamples.map((sample) => sample.features),
        nearestNeighborCount
      )
    : null;
  const goodConfidence = distanceToConfidence(nearestGoodDistance);
  const badConfidence = nearestBadDistance === null ? 0 : distanceToConfidence(nearestBadDistance);
  const score = clamp(goodConfidence * (1 - badConfidence * 0.75), 0, 1);

  return {
    category,
    score,
    goodSamples: goodSamples.length,
    badSamples: badSamples.length,
    nearestGoodDistance,
    nearestBadDistance
  };
}

export function scoreAllCapturedPoses(
  dataset: PoseCaptureDataset,
  signals: NormalizedSignals
): CapturedPoseScore[] {
  return memeCategories
    .map((category) => scoreCapturedPose(dataset, category, signals))
    .filter((score): score is CapturedPoseScore => Boolean(score))
    .sort((a, b) => b.score - a.score);
}

export function parsePoseCaptureDataset(value: string): PoseCaptureDataset | null {
  try {
    const parsed = JSON.parse(value) as Partial<PoseCaptureDataset>;
    if (parsed.version !== 1 || !Array.isArray(parsed.samples)) {
      return null;
    }

    return {
      version: 1,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      samples: parsed.samples.filter(isPoseCaptureSample)
    };
  } catch {
    return null;
  }
}

function isPoseCaptureSample(sample: unknown): sample is PoseCaptureSample {
  if (!sample || typeof sample !== 'object') {
    return false;
  }

  const candidate = sample as PoseCaptureSample;
  return memeCategories.includes(candidate.category) &&
    (candidate.label === 'good' || candidate.label === 'bad') &&
    Array.isArray(candidate.features?.values) &&
    candidate.features.values.length === featureNames.length;
}

function getWeightedDistance(first: PoseFeatureVector, second: PoseFeatureVector): number {
  const totalWeight = featureWeights.reduce((total, weight) => total + weight, 0);
  const total = first.values.reduce((sum, value, index) => {
    const diff = value - (second.values[index] ?? 0);
    return sum + diff * diff * featureWeights[index];
  }, 0);

  return Math.sqrt(total / totalWeight);
}

function getAverageNearestDistance(
  liveFeatures: PoseFeatureVector,
  sampleFeatures: PoseFeatureVector[],
  count: number
): number {
  const distances = sampleFeatures
    .map((features) => getWeightedDistance(liveFeatures, features))
    .sort((a, b) => a - b)
    .slice(0, Math.max(1, Math.min(count, sampleFeatures.length)));

  return distances.reduce((total, distance) => total + distance, 0) / distances.length;
}

function distanceToConfidence(distance: number): number {
  return clamp(1 - distance / 0.52, 0, 1);
}

function normalizeRange(value: number, min: number, max: number): number {
  return clamp((value - min) / (max - min), 0, 1);
}

function bool(value: boolean): number {
  return value ? 1 : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createSampleId(category: MemeCategory, label: PoseCaptureLabel, now: Date): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${category}-${label}-${now.getTime()}-${Math.random().toString(36).slice(2)}`;
}
