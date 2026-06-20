import type { NormalizedSignals } from './calibration.ts';
import type { MemeCategory } from './memeTypes.ts';

export interface ReactionCandidate {
  category: MemeCategory;
  score: number;
  reason: string;
}

interface ReactionRule {
  category: MemeCategory;
  reason: string;
  evaluate: (signals: NormalizedSignals) => number;
}

const minimumScore = 0.45;

const reactionRules: ReactionRule[] = [
  {
    category: 'absolute-cinema',
    reason: 'both palms raised',
    evaluate: (signals) =>
      signals.hands.headTouches === 0 &&
      signals.hands.raisedOpenPalms >= 2
        ? 1
        : 0
  },
  {
    category: 'we-are-cooked',
    reason: 'palms on sides of head with open mouth and wide eyes',
    evaluate: (signals) => {
      const hands = signals.hands.headTouches >= 2 ? 0.5 : 0;
      const mouth = ramp(signals.face.mouthOpenDelta, 0.08, 0.22) * 0.3;
      const eyes = ramp(signals.face.eyeOpennessDelta, 0.05, 0.16) * 0.2;
      return hands + mouth + eyes;
    }
  },
  {
    category: 'ah-hell-nah',
    reason: 'head tilted upward in shock',
    evaluate: (signals) => {
      const gaze = ramp(signals.face.headTiltUpDelta, 0.04, 0.18) * 0.7;
      const mouth = ramp(signals.face.mouthOpenDelta, 0.08, 0.18) * 0.3;
      return gaze + mouth;
    }
  },
  {
    category: 'thinking',
    reason: 'finger near mouth',
    evaluate: (signals) => signals.hands.fingerNearMouth ? 0.88 : 0
  },
  {
    category: 'happy',
    reason: 'tongue out',
    evaluate: (signals) => {
      const tongue = ramp(signals.face.tongueOutDelta, 0.08, 0.18) * 0.8;
      if (tongue === 0) {
        return 0;
      }

      const smile = ramp(signals.face.smileDelta, 0.08, 0.2) * 0.2;
      return tongue + smile;
    }
  }
];

export function evaluateReactionRules(signals: NormalizedSignals): ReactionCandidate[] {
  if (!signals.face.facePresent && signals.hands.raisedOpenPalms < 2) {
    return [];
  }

  return reactionRules
    .map((rule) => ({
      category: rule.category,
      score: clamp(rule.evaluate(signals), 0, 1),
      reason: rule.reason
    }))
    .filter((candidate) => candidate.score >= minimumScore)
    .sort((a, b) => b.score - a.score);
}

function ramp(value: number, start: number, end: number): number {
  if (value <= start) {
    return 0;
  }

  if (value >= end) {
    return 1;
  }

  return (value - start) / (end - start);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
