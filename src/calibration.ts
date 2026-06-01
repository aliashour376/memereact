import type { HandSignals, VisionSignals } from './visionSignals.ts';

export interface CalibrationSample {
  mouthOpen: number;
  eyeOpenness: number;
  browFurrow: number;
  squint: number;
  faceScale: number;
  mouthFrown: number;
  lookUp: number;
  tongueOut: number;
  smile: number;
  headTiltUp: number;
}

export interface CalibrationBaseline extends CalibrationSample {}

export interface NormalizedFaceSignals {
  facePresent: boolean;
  mouthFrown: number;
  mouthOpenDelta: number;
  eyeOpennessDelta: number;
  browFurrowDelta: number;
  squintDelta: number;
  faceScaleRatio: number;
  mouthFrownDelta: number;
  lookUpDelta: number;
  tongueOutDelta: number;
  smileDelta: number;
  headTiltUpDelta: number;
}

export interface NormalizedSignals {
  hands: HandSignals;
  face: NormalizedFaceSignals;
}

export function createCalibrationSession(requiredSamples: number) {
  const samples: CalibrationSample[] = [];

  return {
    addSample(sample: CalibrationSample) {
      if (samples.length < requiredSamples) {
        samples.push(sample);
      }
    },
    getProgress() {
      return Math.min(1, samples.length / requiredSamples);
    },
    isComplete() {
      return samples.length >= requiredSamples;
    },
    getBaseline(): CalibrationBaseline | null {
      if (!this.isComplete()) {
        return null;
      }

      return {
        mouthOpen: round(average(samples.map((sample) => sample.mouthOpen))),
        eyeOpenness: round(average(samples.map((sample) => sample.eyeOpenness))),
        browFurrow: round(average(samples.map((sample) => sample.browFurrow))),
        squint: round(average(samples.map((sample) => sample.squint))),
        faceScale: round(average(samples.map((sample) => sample.faceScale))),
        mouthFrown: round(average(samples.map((sample) => sample.mouthFrown))),
        lookUp: round(average(samples.map((sample) => sample.lookUp))),
        tongueOut: round(average(samples.map((sample) => sample.tongueOut))),
        smile: round(average(samples.map((sample) => sample.smile))),
        headTiltUp: round(average(samples.map((sample) => sample.headTiltUp)))
      };
    }
  };
}

export function toCalibrationSample(signals: VisionSignals): CalibrationSample | null {
  if (!signals.face.facePresent) {
    return null;
  }

  return {
    mouthOpen: signals.face.mouthOpen,
    eyeOpenness: signals.face.eyeOpenness,
    browFurrow: signals.face.browFurrow,
    squint: signals.face.squint,
    faceScale: signals.face.faceScale,
    mouthFrown: signals.face.mouthFrown,
    lookUp: signals.face.lookUp,
    tongueOut: signals.face.tongueOut,
    smile: signals.face.smile,
    headTiltUp: signals.face.headTiltUp
  };
}

export function normalizeSignals(
  signals: VisionSignals,
  baseline: CalibrationBaseline
): NormalizedSignals {
  if (!signals.face.facePresent) {
    return {
      hands: signals.hands,
      face: {
        facePresent: false,
        mouthFrown: 0,
        mouthOpenDelta: 0,
        eyeOpennessDelta: 0,
        browFurrowDelta: 0,
        squintDelta: 0,
        faceScaleRatio: 0,
        mouthFrownDelta: 0,
        lookUpDelta: 0,
        tongueOutDelta: 0,
        smileDelta: 0,
        headTiltUpDelta: 0
      }
    };
  }

  return {
    hands: signals.hands,
    face: {
      facePresent: true,
      mouthFrown: round(signals.face.mouthFrown),
      mouthOpenDelta: round(Math.max(0, signals.face.mouthOpen - baseline.mouthOpen)),
      eyeOpennessDelta: round(Math.max(0, signals.face.eyeOpenness - baseline.eyeOpenness)),
      browFurrowDelta: round(Math.max(0, signals.face.browFurrow - baseline.browFurrow)),
      squintDelta: round(Math.max(0, signals.face.squint - baseline.squint)),
      faceScaleRatio: round(baseline.faceScale > 0 ? signals.face.faceScale / baseline.faceScale : 0),
      mouthFrownDelta: round(Math.max(0, signals.face.mouthFrown - baseline.mouthFrown)),
      lookUpDelta: round(Math.max(0, signals.face.lookUp - baseline.lookUp)),
      tongueOutDelta: round(Math.max(0, signals.face.tongueOut - baseline.tongueOut)),
      smileDelta: round(Math.max(0, signals.face.smile - baseline.smile)),
      headTiltUpDelta: round(Math.max(0, signals.face.headTiltUp - baseline.headTiltUp))
    }
  };
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
