import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateReactionRules } from './reactionRules.ts';
import type { NormalizedSignals } from './calibration.ts';

const neutralSignals: NormalizedSignals = {
  hands: {
    thumbsUp: false,
    handNearFace: false,
    handCount: 0,
    raisedOpenPalms: 0,
    handsOnHead: 0,
    headTouches: 0,
    sideHeadPalmContacts: 0,
    raisedHandsWithThumbs: 0
  },
  face: {
    facePresent: true,
    mouthOpenDelta: 0,
    eyeOpennessDelta: 0,
    browFurrowDelta: 0,
    squintDelta: 0,
    faceScaleRatio: 1,
    mouthFrownDelta: 0,
    lookUpDelta: 0,
    headTiltUpDelta: 0
  }
};

describe('evaluateReactionRules', () => {
  it('scores absolute cinema highest for two raised open palms', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, raisedOpenPalms: 2, handCount: 2 }
    });

    assert.equal(result[0]?.category, 'absolute-cinema');
    assert.equal(result[0]?.reason, 'both palms raised');
  });

  it('does not score absolute cinema when palms are touching both sides of the head', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      hands: {
        ...neutralSignals.hands,
        raisedOpenPalms: 2,
        raisedHandsWithThumbs: 2,
        handsOnHead: 2,
        headTouches: 2,
        sideHeadPalmContacts: 2,
        handCount: 2
      },
      face: { ...neutralSignals.face, mouthOpenDelta: 0.18, eyeOpennessDelta: 0.12 }
    });

    assert.equal(result[0]?.category, 'we-are-cooked');
    assert.equal(result.find((candidate) => candidate.category === 'absolute-cinema'), undefined);
  });

  it('scores we are cooked highest for true head contact plus open mouth and wide eyes', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, headTouches: 2, sideHeadPalmContacts: 2, handsOnHead: 2, handCount: 2 },
      face: { ...neutralSignals.face, mouthOpenDelta: 0.18, eyeOpennessDelta: 0.12 }
    });

    assert.equal(result[0]?.category, 'we-are-cooked');
  });

  it('scores we are cooked from two true head touches without expression cues', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, headTouches: 2, handCount: 2 }
    });

    assert.equal(result[0]?.category, 'we-are-cooked');
  });

  it('raises we are cooked confidence when expression cues are also present', () => {
    const touchOnly = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, headTouches: 2, handCount: 2 }
    });
    const expressive = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, headTouches: 2, handCount: 2 },
      face: { ...neutralSignals.face, mouthOpenDelta: 0.18, eyeOpennessDelta: 0.12 }
    });

    assert.ok((expressive[0]?.score ?? 0) > (touchOnly[0]?.score ?? 0));
  });

  it('does not score we are cooked from generic head overlap without side-head palm contact', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, handsOnHead: 2, handCount: 2 },
      face: { ...neutralSignals.face, mouthOpenDelta: 0.18, eyeOpennessDelta: 0.12 }
    });

    assert.equal(result.find((candidate) => candidate.category === 'we-are-cooked'), undefined);
  });

  it('scores ah hell nah highest when the user tilts their head upward in shock', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      face: { ...neutralSignals.face, headTiltUpDelta: 0.22, mouthOpenDelta: 0.14 }
    });

    assert.equal(result[0]?.category, 'ah-hell-nah');
  });

  it('scores thinking from hand-near-mouth pose alone', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, handNearFace: true, handCount: 1 }
    });

    assert.equal(result[0]?.category, 'thinking');
  });

  it('does not score thinking when a hand is only near the side of the face', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, handNearFace: false, handCount: 1 }
    });

    assert.equal(result.find((candidate) => candidate.category === 'thinking'), undefined);
  });

  it('scores lmao highest for an unimpressed straight face', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      face: { ...neutralSignals.face, mouthFrown: 0.18 }
    });

    assert.equal(result[0]?.category, 'lmao');
  });

  it('does not score lmao while any hand is visible', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, handCount: 2 },
      face: { ...neutralSignals.face, mouthFrown: 0.18 }
    });

    assert.equal(result.find((candidate) => candidate.category === 'lmao'), undefined);
  });

  it('does not score lmao during an ah hell nah pose', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      face: {
        ...neutralSignals.face,
        mouthFrown: 0.18,
        headTiltUpDelta: 0.22,
        mouthOpenDelta: 0.14
      }
    });

    assert.equal(result[0]?.category, 'ah-hell-nah');
    assert.equal(result.find((candidate) => candidate.category === 'lmao'), undefined);
  });

  it('returns no candidates for neutral signals', () => {
    assert.deepEqual(evaluateReactionRules(neutralSignals), []);
  });
});
