import type { NormalizedSignals } from './calibration.ts';
import type { MemeCategory } from './memeTypes.ts';

export interface PoseGuideCheck {
  label: string;
  progress: number;
  met: boolean;
}

export interface PoseGuideMatch {
  category: MemeCategory;
  score: number;
  status: 'waiting' | 'searching' | 'close' | 'matched';
  hint: string;
  checks: PoseGuideCheck[];
}

export function evaluatePoseGuide(signals: NormalizedSignals, category: MemeCategory): PoseGuideMatch {
  const checks = getChecks(signals, category);
  const score = getScore(category, checks);
  const status = getStatus(score);

  return {
    category,
    score,
    status,
    hint: getHint(category, checks, status),
    checks
  };
}

function getScore(category: MemeCategory, checks: PoseGuideCheck[]): number {
  if (category === 'absolute-cinema') {
    const [openPalms, handsOffHead] = checks;
    const palmsProgress = openPalms?.progress ?? 0;
    return clamp(palmsProgress * 0.7 + (palmsProgress > 0 ? (handsOffHead?.progress ?? 0) * 0.3 : 0), 0, 1);
  }

  if (category === 'happy') {
    const [tongue, smile] = checks;
    return clamp((tongue?.progress ?? 0) * 0.82 + (smile?.progress ?? 0) * 0.18, 0, 1);
  }

  return clamp(checks.reduce((total, check) => total + check.progress, 0) / checks.length, 0, 1);
}

function getChecks(signals: NormalizedSignals, category: MemeCategory): PoseGuideCheck[] {
  if (category === 'absolute-cinema') {
    return [
      createCheck('Show both open palms', countProgress(signals.hands.raisedOpenPalms, 2)),
      createCheck(
        'Keep hands off head',
        signals.hands.raisedOpenPalms > 0 && signals.hands.headTouches === 0 ? 1 : 0
      )
    ];
  }

  if (category === 'we-are-cooked') {
    return [
      createCheck('Put both palms on head', countProgress(signals.hands.headTouches, 2)),
      createCheck('Mouth open', ramp(signals.face.mouthOpenDelta, 0.08, 0.22))
    ];
  }

  if (category === 'ah-hell-nah') {
    return [
      createCheck('Head tilted up', ramp(signals.face.headTiltUpDelta, 0.04, 0.18)),
      createCheck('Mouth open', ramp(signals.face.mouthOpenDelta, 0.08, 0.18))
    ];
  }

  if (category === 'thinking') {
    return [
      createCheck('Hand near face', signals.hands.handNearFace ? 1 : 0),
      createCheck('Point finger near mouth', signals.hands.fingerNearMouth ? 1 : 0)
    ];
  }

  const tongue = ramp(signals.face.tongueOutDelta, 0.08, 0.18);
  return [
    createCheck('Tongue out', tongue),
    createCheck('Smile', tongue > 0 ? ramp(signals.face.smileDelta, 0.08, 0.2) : 0)
  ];
}

function createCheck(label: string, progress: number): PoseGuideCheck {
  const normalizedProgress = clamp(progress, 0, 1);
  return {
    label,
    progress: normalizedProgress,
    met: normalizedProgress >= 0.74
  };
}

function getStatus(score: number): PoseGuideMatch['status'] {
  if (score >= 0.78) return 'matched';
  if (score >= 0.45) return 'close';
  if (score >= 0.16) return 'searching';
  return 'waiting';
}

function countProgress(value: number, target: number): number {
  return target > 0 ? clamp(value / target, 0, 1) : 0;
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

function getHint(
  category: MemeCategory,
  checks: PoseGuideCheck[],
  status: PoseGuideMatch['status']
): string {
  if (status === 'matched') {
    return 'Matched - hold it';
  }

  const nextCheck = checks
    .filter((check) => !check.met)
    .sort((a, b) => a.progress - b.progress)[0];

  if (!nextCheck) {
    return 'Hold the pose';
  }

  return hintCopy[category][nextCheck.label] ?? nextCheck.label;
}

const hintCopy: Record<MemeCategory, Record<string, string>> = {
  'absolute-cinema': {
    'Show both open palms': 'Show both open palms',
    'Keep hands off head': 'Move hands away from your head'
  },
  'we-are-cooked': {
    'Put both palms on head': 'Put both palms on your head',
    'Mouth open': 'Open your mouth a bit'
  },
  'ah-hell-nah': {
    'Head tilted up': 'Tilt your head upward',
    'Mouth open': 'Open your mouth a bit'
  },
  thinking: {
    'Hand near face': 'Bring a hand near your face',
    'Point finger near mouth': 'Point a finger near your mouth'
  },
  happy: {
    'Tongue out': 'Stick your tongue out',
    Smile: 'Smile if you can'
  }
};
