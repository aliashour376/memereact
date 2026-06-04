import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluatePoseGuide } from './poseGuide.ts';
import type { NormalizedSignals } from './calibration.ts';

const neutralSignals: NormalizedSignals = {
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
    raisedHandsWithThumbs: 0
  },
  face: {
    facePresent: true,
    mouthFrown: 0,
    mouthOpenDelta: 0,
    eyeOpennessDelta: 0,
    browFurrowDelta: 0,
    squintDelta: 0,
    faceScaleRatio: 1,
    mouthFrownDelta: 0,
    lookUpDelta: 0,
    tongueOutDelta: 0,
    smileDelta: 0,
    headTiltUpDelta: 0
  }
};

describe('evaluatePoseGuide', () => {
  it('matches absolute cinema from two raised open palms away from the head', () => {
    const result = evaluatePoseGuide({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, raisedOpenPalms: 2, handHeightRatio: [0.2, 0.22], handCount: 2 }
    }, 'absolute-cinema');

    assert.equal(result.status, 'matched');
    assert.equal(result.hint, 'Matched - hold it');
    assert.equal(result.checks.every((check) => check.met), true);
  });

  it('suggests open palms first for neutral absolute cinema', () => {
    const result = evaluatePoseGuide(neutralSignals, 'absolute-cinema');

    assert.equal(result.status, 'searching');
    assert.equal(result.hint, 'Show both open palms');
  });

  it('keeps absolute cinema below matched when the hands touch the head', () => {
    const result = evaluatePoseGuide({
      ...neutralSignals,
      hands: {
        ...neutralSignals.hands,
        raisedOpenPalms: 2,
        headTouches: 2,
        handHeightRatio: [0.2, 0.22],
        handCount: 2
      }
    }, 'absolute-cinema');

    assert.equal(result.status, 'close');
    assert.equal(result.hint, 'Move hands away from your head');
  });

  it('matches we are cooked from head contact plus mouth open', () => {
    const result = evaluatePoseGuide({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, headTouches: 2, handCount: 2 },
      face: { ...neutralSignals.face, mouthOpenDelta: 0.22 }
    }, 'we-are-cooked');

    assert.equal(result.status, 'matched');
    assert.equal(result.hint, 'Matched - hold it');
    assert.deepEqual(result.checks.map((check) => check.label), [
      'Put both palms on head',
      'Mouth open'
    ]);
  });

  it('marks thinking close from a broad hand near the face but not matched', () => {
    const result = evaluatePoseGuide({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, handNearFace: true, fingerNearMouth: false, handCount: 1 }
    }, 'thinking');

    assert.equal(result.status, 'close');
    assert.equal(result.hint, 'Point a finger near your mouth');
  });

  it('does not match happy from smile alone', () => {
    const result = evaluatePoseGuide({
      ...neutralSignals,
      face: { ...neutralSignals.face, smileDelta: 0.2 }
    }, 'happy');

    assert.equal(result.status, 'waiting');
    assert.equal(result.hint, 'Stick your tongue out');
  });

  it('matches happy from tongue out alone', () => {
    const result = evaluatePoseGuide({
      ...neutralSignals,
      face: { ...neutralSignals.face, tongueOutDelta: 0.18 }
    }, 'happy');

    assert.equal(result.status, 'matched');
  });

  it('matches happy when tongue out and smile cues are both present', () => {
    const result = evaluatePoseGuide({
      ...neutralSignals,
      face: { ...neutralSignals.face, tongueOutDelta: 0.18, smileDelta: 0.2 }
    }, 'happy');

    assert.equal(result.status, 'matched');
  });
});
