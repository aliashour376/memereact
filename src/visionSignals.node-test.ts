import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deriveVisionSignals } from './visionSignals.ts';

describe('deriveVisionSignals', () => {
  it('detects two raised open-ish hands without side-head palm contact', () => {
    const hand = [
      { x: 0.3, y: 0.2, z: 0 },
      { x: 0.28, y: 0.16, z: 0 },
      { x: 0.26, y: 0.14, z: 0 },
      { x: 0.24, y: 0.12, z: 0 },
      { x: 0.22, y: 0.1, z: 0 },
      { x: 0.31, y: 0.15, z: 0 },
      { x: 0.31, y: 0.12, z: 0 },
      { x: 0.31, y: 0.09, z: 0 },
      { x: 0.31, y: 0.05, z: 0 },
      { x: 0.34, y: 0.15, z: 0 },
      { x: 0.34, y: 0.12, z: 0 },
      { x: 0.34, y: 0.09, z: 0 },
      { x: 0.34, y: 0.05, z: 0 },
      { x: 0.37, y: 0.15, z: 0 },
      { x: 0.37, y: 0.12, z: 0 },
      { x: 0.37, y: 0.09, z: 0 },
      { x: 0.37, y: 0.05, z: 0 },
      { x: 0.4, y: 0.15, z: 0 },
      { x: 0.4, y: 0.12, z: 0 },
      { x: 0.4, y: 0.09, z: 0 },
      { x: 0.4, y: 0.05, z: 0 }
    ];

    const face = createFace();

    const result = deriveVisionSignals(
      { landmarks: [hand, hand.map((point) => ({ ...point, x: point.x + 0.3 }))] } as never,
      {
        faceLandmarks: [face],
        faceBlendshapes: [{ categories: [] }]
      } as never
    );

    assert.equal(result.hands.raisedOpenPalms, 2);
    assert.equal(result.hands.raisedHandsWithThumbs, 2);
    assert.equal(result.hands.handsOnHead, 2);
    assert.equal(result.hands.sideHeadPalmContacts, 0);
    assert.equal(result.hands.topHeadPalmContacts, 0);
    assert.equal(result.hands.headTouches, 0);
    assert.deepEqual(result.hands.palmCenterXRatio, [0.11, 0.86]);
    assert.deepEqual(result.hands.palmCenterYRatio, [-0.07, -0.07]);
    assert.deepEqual(result.hands.handHeightRatio, [0.25, 0.25]);
  });

  it('detects palm contact on both sides of the head', () => {
    const face = createFace();
    const leftPalm = createPalmCluster(0.24, 0.38);
    const rightPalm = createPalmCluster(0.76, 0.38);

    const result = deriveVisionSignals(
      { landmarks: [leftPalm, rightPalm] } as never,
      { faceLandmarks: [face], faceBlendshapes: [{ categories: [] }] } as never
    );

    assert.equal(result.hands.sideHeadPalmContacts, 2);
  });

  it('detects true palm contact on both sides of the head', () => {
    const face = createFace();
    const leftPalm = createPalmCluster(0.24, 0.38);
    const rightPalm = createPalmCluster(0.76, 0.38);

    const result = deriveVisionSignals(
      { landmarks: [leftPalm, rightPalm] } as never,
      { faceLandmarks: [face], faceBlendshapes: [{ categories: [] }] } as never
    );

    assert.equal(result.hands.headTouches, 2);
  });

  it('detects true palm contact on top of the head', () => {
    const face = createFace();
    const leftTopPalm = createCompactPalmCluster(0.42, 0.15);
    const rightTopPalm = createCompactPalmCluster(0.58, 0.15);

    const result = deriveVisionSignals(
      { landmarks: [leftTopPalm, rightTopPalm] } as never,
      { faceLandmarks: [face], faceBlendshapes: [{ categories: [] }] } as never
    );

    assert.equal(result.hands.topHeadPalmContacts, 2);
    assert.equal(result.hands.headTouches, 2);
    assert.deepEqual(result.hands.palmCenterXRatio, [0.3, 0.7]);
    assert.deepEqual(result.hands.palmCenterYRatio, [-0.07, -0.07]);
    assert.deepEqual(result.hands.handHeightRatio, [0.02, 0.02]);
  });

  it('limits the thinking zone to the mouth and chin area', () => {
    const face = createFace();
    const sideFaceHand = Array.from({ length: 21 }, () => ({ x: 0.28, y: 0.45, z: 0 }));
    const mouthHand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.64, z: 0 }));

    const sideResult = deriveVisionSignals(
      { landmarks: [sideFaceHand] } as never,
      { faceLandmarks: [face], faceBlendshapes: [{ categories: [] }] } as never
    );
    const mouthResult = deriveVisionSignals(
      { landmarks: [mouthHand] } as never,
      { faceLandmarks: [face], faceBlendshapes: [{ categories: [] }] } as never
    );

    assert.equal(sideResult.hands.handNearFace, false);
    assert.equal(mouthResult.hands.handNearFace, true);
  });

  it('derives upward head tilt from face landmarks', () => {
    const face = createFace();
    face[1] = { x: 0.5, y: 0.37, z: 0 };
    face[152] = { x: 0.5, y: 0.82, z: 0 };

    const result = deriveVisionSignals(
      null,
      { faceLandmarks: [face], faceBlendshapes: [{ categories: [] }] } as never
    );

    assert.ok(result.face.headTiltUp > 0);
  });
});

function createFace() {
  const face = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  face[10] = { x: 0.5, y: 0.2, z: 0 };
  face[152] = { x: 0.5, y: 0.8, z: 0 };
  face[234] = { x: 0.3, y: 0.5, z: 0 };
  face[454] = { x: 0.7, y: 0.5, z: 0 };
  face[1] = { x: 0.5, y: 0.47, z: 0 };
  face[13] = { x: 0.5, y: 0.61, z: 0 };
  face[14] = { x: 0.5, y: 0.67, z: 0 };
  return face;
}

function createPalmCluster(centerX: number, centerY: number) {
  return Array.from({ length: 21 }, (_, index) => ({
    x: centerX + ((index % 3) - 1) * 0.01,
    y: centerY + (Math.floor(index / 3) % 3) * 0.01,
    z: 0
  }));
}

function createCompactPalmCluster(centerX: number, centerY: number) {
  return Array.from({ length: 21 }, (_, index) => ({
    x: centerX + ((index % 5) - 2) * 0.01,
    y: centerY + (Math.floor(index / 5) % 2) * 0.01,
    z: 0
  }));
}
