import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  appendPoseCaptureSamples,
  createEmptyPoseDataset,
  createPoseCaptureSample,
  extractPoseFeatures,
  scoreCapturedPose
} from './poseCapture.ts';
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

const letsLarpSignals: NormalizedSignals = {
  ...neutralSignals,
  hands: {
    ...neutralSignals.hands,
    handCount: 1,
    raisedOpenPalms: 1,
    palmCenterXRatio: [-0.6],
    palmCenterYRatio: [1.38],
    handHeightRatio: [0.85]
  },
  face: { ...neutralSignals.face, faceScaleRatio: 0.99, headTiltSideDelta: 0.09 }
};

describe('pose capture model', () => {
  it('extracts a stable fixed-length feature vector', () => {
    const features = extractPoseFeatures(letsLarpSignals);

    assert.equal(features.names.length, features.values.length);
    assert.equal(features.values.every((value) => value >= 0 && value <= 1), true);
  });

  it('scores a live pose from captured good examples', () => {
    const dataset = appendPoseCaptureSamples(
      createEmptyPoseDataset(new Date('2026-06-04T00:00:00.000Z')),
      Array.from({ length: 9 }, (_, index) =>
        createPoseCaptureSample('lets-larp', 'good', {
          ...letsLarpSignals,
          hands: {
            ...letsLarpSignals.hands,
            palmCenterXRatio: [-0.58 - index * 0.002],
            palmCenterYRatio: [1.34 + index * 0.004],
            handHeightRatio: [0.82 + index * 0.003]
          }
        }, new Date(`2026-06-04T00:00:0${index}.000Z`))
      ),
      new Date('2026-06-04T00:00:10.000Z')
    );

    const score = scoreCapturedPose(dataset, 'lets-larp', letsLarpSignals);

    assert.ok(score);
    assert.ok(score.score > 0.82);
  });

  it('reduces confidence when the live pose is closer to captured bad examples', () => {
    const goodSamples = Array.from({ length: 9 }, (_, index) =>
      createPoseCaptureSample('lets-larp', 'good', letsLarpSignals, new Date(`2026-06-04T00:00:0${index}.000Z`))
    );
    const badSamples = Array.from({ length: 9 }, (_, index) =>
      createPoseCaptureSample('lets-larp', 'bad', neutralSignals, new Date(`2026-06-04T00:00:1${index}.000Z`))
    );
    const dataset = appendPoseCaptureSamples(
      createEmptyPoseDataset(new Date('2026-06-04T00:00:00.000Z')),
      [...goodSamples, ...badSamples],
      new Date('2026-06-04T00:00:20.000Z')
    );

    const neutralScore = scoreCapturedPose(dataset, 'lets-larp', neutralSignals);
    const goodScore = scoreCapturedPose(dataset, 'lets-larp', letsLarpSignals);

    assert.ok(neutralScore);
    assert.ok(goodScore);
    assert.ok(goodScore.score > neutralScore.score);
  });

  it('waits for enough good examples before scoring', () => {
    const dataset = appendPoseCaptureSamples(
      createEmptyPoseDataset(new Date('2026-06-04T00:00:00.000Z')),
      [createPoseCaptureSample('lets-larp', 'good', letsLarpSignals)],
      new Date('2026-06-04T00:00:01.000Z')
    );

    assert.equal(scoreCapturedPose(dataset, 'lets-larp', letsLarpSignals), null);
  });
});
