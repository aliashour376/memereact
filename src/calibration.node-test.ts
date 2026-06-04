import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createCalibrationSession,
  normalizeSignals,
  toCalibrationSample,
  type CalibrationSample
} from './calibration.ts';
import type { VisionSignals } from './visionSignals.ts';

const neutralSample: CalibrationSample = {
  mouthOpen: 0.1,
  eyeOpenness: 0.2,
  browFurrow: 0.15,
  squint: 0.08,
  faceScale: 0.2,
  mouthFrown: 0.05,
  lookUp: 0.04,
  lookDown: 0.03,
  tongueOut: 0.07,
  smile: 0.09,
  headTiltUp: 0.03,
  headTiltDown: 0.02,
  headTiltSide: 0.01
};

describe('calibration', () => {
  it('captures raw tongue-out and smile values in calibration samples', () => {
    const signals: VisionSignals = {
      hands: {
        thumbsUp: false,
        handNearFace: false,
        fingerNearMouth: false,
        handCount: 0,
        raisedOpenPalms: 0,
        handsOnHead: 0,
        headTouches: 0,
        sideHeadPalmContacts: 0,
        topHeadPalmContacts: 0,
        palmCenterXRatio: [],
        palmCenterYRatio: [],
        handHeightRatio: [],
        raisedHandsWithThumbs: 0,
        palmsTogetherNearFace: false,
        fingerGunAtCamera: false
      },
      face: {
        facePresent: true,
        mouthOpen: 0.1,
        eyeOpenness: 0.2,
        browFurrow: 0.15,
        squint: 0.08,
        faceScale: 0.2,
        mouthFrown: 0.05,
        lookUp: 0.04,
        lookDown: 0.03,
        tongueOut: 0.7,
        smile: 0.6,
        headTiltUp: 0.03,
        headTiltDown: 0.02,
        headTiltSide: 0.01
      }
    };

    assert.deepEqual(toCalibrationSample(signals), {
      mouthOpen: 0.1,
      eyeOpenness: 0.2,
      browFurrow: 0.15,
      squint: 0.08,
      faceScale: 0.2,
      mouthFrown: 0.05,
      lookUp: 0.04,
      lookDown: 0.03,
      tongueOut: 0.7,
      smile: 0.6,
      headTiltUp: 0.03,
      headTiltDown: 0.02,
      headTiltSide: 0.01
    });
  });

  it('averages accepted neutral samples into a baseline', () => {
    const session = createCalibrationSession(3);

    session.addSample(neutralSample);
    session.addSample({ ...neutralSample, mouthOpen: 0.16, faceScale: 0.24, tongueOut: 0.1, smile: 0.12 });
    session.addSample({ ...neutralSample, mouthOpen: 0.13, faceScale: 0.22, tongueOut: 0.04, smile: 0.06 });

    assert.equal(session.isComplete(), true);
    assert.deepEqual(session.getBaseline(), {
      mouthOpen: 0.13,
      eyeOpenness: 0.2,
      browFurrow: 0.15,
      squint: 0.08,
      faceScale: 0.22,
      mouthFrown: 0.05,
      lookUp: 0.04,
      lookDown: 0.03,
      tongueOut: 0.07,
      smile: 0.09,
      headTiltUp: 0.03,
      headTiltDown: 0.02,
      headTiltSide: 0.01
    });
  });

  it('normalizes live signals relative to the calibrated baseline', () => {
    const signals: VisionSignals = {
      hands: {
        thumbsUp: false,
        handNearFace: true,
        fingerNearMouth: true,
        handCount: 1,
        raisedOpenPalms: 0,
        handsOnHead: 0,
        headTouches: 0,
        sideHeadPalmContacts: 0,
        topHeadPalmContacts: 0,
        palmCenterXRatio: [],
        palmCenterYRatio: [],
        handHeightRatio: [],
        raisedHandsWithThumbs: 0,
        palmsTogetherNearFace: false,
        fingerGunAtCamera: false
      },
      face: {
        facePresent: true,
        mouthOpen: 0.42,
        eyeOpenness: 0.5,
        browFurrow: 0.31,
        squint: 0.2,
        faceScale: 0.33,
        mouthFrown: 0.2,
        lookUp: 0.31,
        lookDown: 0.23,
        tongueOut: 0.7,
        smile: 0.6,
        headTiltUp: 0.21,
        headTiltDown: 0.12,
        headTiltSide: 0.08
      }
    };

    assert.deepEqual(normalizeSignals(signals, neutralSample), {
      hands: signals.hands,
      face: {
        facePresent: true,
        mouthFrown: 0.2,
        mouthOpenDelta: 0.32,
        eyeOpennessDelta: 0.3,
        browFurrowDelta: 0.16,
        squintDelta: 0.12,
        faceScaleRatio: 1.65,
        mouthFrownDelta: 0.15,
        lookUpDelta: 0.27,
        lookDownDelta: 0.2,
        tongueOutDelta: 0.63,
        smileDelta: 0.51,
        headTiltUpDelta: 0.18,
        headTiltDownDelta: 0.1,
        headTiltSideDelta: 0.07
      }
    });
  });

  it('returns neutral normalized face values when the face is missing', () => {
    const signals: VisionSignals = {
      hands: {
        thumbsUp: false,
        handNearFace: false,
        fingerNearMouth: false,
        handCount: 0,
        raisedOpenPalms: 0,
        handsOnHead: 0,
        headTouches: 0,
        sideHeadPalmContacts: 0,
        topHeadPalmContacts: 0,
        palmCenterXRatio: [],
        palmCenterYRatio: [],
        handHeightRatio: [],
        raisedHandsWithThumbs: 0,
        palmsTogetherNearFace: false,
        fingerGunAtCamera: false
      },
      face: {
        facePresent: false,
        mouthOpen: 0,
        eyeOpenness: 0,
        browFurrow: 0,
        squint: 0,
        faceScale: 0,
        mouthFrown: 0,
        lookUp: 0,
        lookDown: 0,
        tongueOut: 0,
        smile: 0,
        headTiltUp: 0,
        headTiltDown: 0,
        headTiltSide: 0
      }
    };

    assert.deepEqual(normalizeSignals(signals, neutralSample), {
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
        lookDownDelta: 0,
        tongueOutDelta: 0,
        smileDelta: 0,
        headTiltUpDelta: 0,
        headTiltDownDelta: 0,
        headTiltSideDelta: 0
      }
    });
  });
});
