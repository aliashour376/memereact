import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateReactionRules } from './reactionRules.ts';
import type { NormalizedSignals } from './calibration.ts';
import type { MemeCategory } from './memeTypes.ts';

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
    raisedHandsWithThumbs: 0,
    palmsTogetherNearFace: false,
    fingerGunAtCamera: false
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
    lookDownDelta: 0,
    tongueOutDelta: 0,
    smileDelta: 0,
    headTiltUpDelta: 0,
    headTiltDownDelta: 0,
    headTiltSideDelta: 0
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
    assert.equal(result[0]?.reason, 'palms on head');
    assert.equal(result.find((candidate) => candidate.category === 'absolute-cinema'), undefined);
  });

  it('scores we are cooked highest for true head contact plus expression boosts', () => {
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

  it('does not score ah hell nah from chin-up without an open mouth', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      face: { ...neutralSignals.face, headTiltUpDelta: 0.22 }
    });

    assert.equal(result.find((candidate) => candidate.category === 'ah-hell-nah'), undefined);
  });

  it('scores thinking from an index finger near the mouth', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, handNearFace: true, fingerNearMouth: true, handCount: 1 }
    });

    assert.equal(result[0]?.category, 'thinking');
  });

  it('does not score thinking from a broad hand near the mouth', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, handNearFace: true, fingerNearMouth: false, handCount: 1 }
    });

    assert.equal(result.find((candidate) => candidate.category === 'thinking'), undefined);
  });

  it('does not score thinking when a hand is only near the side of the face', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, handNearFace: false, handCount: 1 }
    });

    assert.equal(result.find((candidate) => candidate.category === 'thinking'), undefined);
  });

  it('scores happy from tongue out alone', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      face: { ...neutralSignals.face, tongueOutDelta: 0.18 }
    });

    assert.equal(result[0]?.category, 'happy');
  });

  it('raises happy confidence when smile is also present', () => {
    const tongueOnly = evaluateReactionRules({
      ...neutralSignals,
      face: { ...neutralSignals.face, tongueOutDelta: 0.18 }
    });
    const smiling = evaluateReactionRules({
      ...neutralSignals,
      face: { ...neutralSignals.face, tongueOutDelta: 0.18, smileDelta: 0.2 }
    });

    assert.ok((smiling[0]?.score ?? 0) > (tongueOnly[0]?.score ?? 0));
  });

  it('does not score happy from smile alone', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      face: { ...neutralSignals.face, smileDelta: 0.2 }
    });

    assert.equal(result.find((candidate) => candidate.category === 'happy'), undefined);
  });

  it('does not suppress happy while hands are visible', () => {
    const result = evaluateReactionRules({
      ...neutralSignals,
      hands: { ...neutralSignals.hands, handCount: 2 },
      face: { ...neutralSignals.face, tongueOutDelta: 0.18 }
    });

    assert.equal(result[0]?.category, 'happy');
  });

  it('does not score the new captured-only memes from old hand-written cues', () => {
    const capturedOnlyCategories: MemeCategory[] = ['lets-larp', 'no-idea-cuh', 'son', 'tf', 'zoltraak'];
    const oldCueResults = [
      evaluateReactionRules({
        ...neutralSignals,
        hands: { ...neutralSignals.hands, handCount: 1, fingerGunAtCamera: true },
        face: { ...neutralSignals.face, headTiltSideDelta: 0.09 }
      }),
      evaluateReactionRules({
        ...neutralSignals,
        hands: {
          ...neutralSignals.hands,
          handCount: 2,
          raisedOpenPalms: 2,
          palmCenterYRatio: [0.62, 0.68],
          handHeightRatio: [0.22, 0.24]
        }
      }),
      evaluateReactionRules({
        ...neutralSignals,
        hands: { ...neutralSignals.hands, handCount: 2, palmsTogetherNearFace: true }
      }),
      evaluateReactionRules({
        ...neutralSignals,
        face: { ...neutralSignals.face, headTiltDownDelta: 0.17, lookDownDelta: 0.18 }
      }),
      evaluateReactionRules({
        ...neutralSignals,
        face: { ...neutralSignals.face, headTiltUpDelta: 0.28, mouthOpenDelta: 0.01 }
      })
    ];

    assert.equal(
      oldCueResults.flat().some((candidate) => capturedOnlyCategories.includes(candidate.category)),
      false
    );
  });

  it('returns no candidates for neutral signals', () => {
    assert.deepEqual(evaluateReactionRules(neutralSignals), []);
  });
});
