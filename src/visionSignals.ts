import type {
  FaceLandmarkerResult,
  HandLandmarkerResult,
  NormalizedLandmark
} from '@mediapipe/tasks-vision';

export interface HandSignals {
  thumbsUp: boolean;
  handNearFace: boolean;
  fingerNearMouth: boolean;
  handCount: number;
  raisedOpenPalms: number;
  handsOnHead: number;
  headTouches: number;
  sideHeadPalmContacts: number;
  topHeadPalmContacts: number;
  palmCenterXRatio: number[];
  palmCenterYRatio: number[];
  handHeightRatio: number[];
  raisedHandsWithThumbs: number;
}

export interface FaceSignals {
  facePresent: boolean;
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

export interface VisionSignals {
  hands: HandSignals;
  face: FaceSignals;
}

export const neutralSignals: VisionSignals = {
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
    facePresent: false,
    mouthOpen: 0,
    eyeOpenness: 0,
    browFurrow: 0,
    squint: 0,
    faceScale: 0,
    mouthFrown: 0,
    lookUp: 0,
    tongueOut: 0,
    smile: 0,
    headTiltUp: 0
  }
};

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  area: number;
}

export function deriveVisionSignals(
  handResult: HandLandmarkerResult | null,
  faceResult: FaceLandmarkerResult | null
): VisionSignals {
  const faceLandmarks = faceResult?.faceLandmarks?.[0] ?? [];
  const faceBounds = faceLandmarks.length > 0 ? getBounds(faceLandmarks) : null;
  const blendshapes = faceResult?.faceBlendshapes?.[0]?.categories ?? [];

  const mouthOpen = getBlendshape(blendshapes, 'jawOpen');
  const eyeOpenness = average(
    getBlendshape(blendshapes, 'eyeWideLeft'),
    getBlendshape(blendshapes, 'eyeWideRight')
  );
  const browFurrow = average(
    getBlendshape(blendshapes, 'browDownLeft'),
    getBlendshape(blendshapes, 'browDownRight')
  );
  const squint = average(
    getBlendshape(blendshapes, 'eyeSquintLeft'),
    getBlendshape(blendshapes, 'eyeSquintRight'),
    getBlendshape(blendshapes, 'noseSneerLeft'),
    getBlendshape(blendshapes, 'noseSneerRight')
  );
  const mouthFrown = average(
    getBlendshape(blendshapes, 'mouthFrownLeft'),
    getBlendshape(blendshapes, 'mouthFrownRight')
  );
  const lookUp = average(
    getBlendshape(blendshapes, 'eyeLookUpLeft'),
    getBlendshape(blendshapes, 'eyeLookUpRight')
  );
  const smile = average(
    getBlendshape(blendshapes, 'mouthSmileLeft'),
    getBlendshape(blendshapes, 'mouthSmileRight')
  );
  const tongueOut = deriveTongueOut(getBlendshape(blendshapes, 'tongueOut'), mouthOpen, smile);
  const headTiltUp = faceLandmarks.length > 0 ? getHeadTiltUp(faceLandmarks) : 0;

  const hands = handResult?.landmarks ?? [];
  const sideHeadPalmContacts = faceBounds ? hands.filter((hand) => isPalmTouchingSideOfHead(hand, faceBounds)).length : 0;
  const topHeadPalmContacts = faceBounds ? hands.filter((hand) => isPalmTouchingTopOfHead(hand, faceBounds)).length : 0;
  const contactDiagnostics = faceBounds ? hands.map((hand) => getHeadContactDiagnostics(hand, faceBounds)) : [];

  return {
    hands: {
      handCount: hands.length,
      thumbsUp: hands.some(isThumbsUp),
      handNearFace: Boolean(faceBounds && hands.some((hand) => isHandNearFace(hand, faceBounds))),
      fingerNearMouth: Boolean(faceBounds && hands.some((hand) => isFingerNearMouth(hand, faceBounds))),
      raisedOpenPalms: hands.filter(isRaisedOpenPalm).length,
      handsOnHead: faceBounds ? hands.filter((hand) => isHandOnHead(hand, faceBounds)).length : 0,
      headTouches: faceBounds
        ? hands.filter((hand) =>
            isPalmTouchingSideOfHead(hand, faceBounds) ||
            isPalmTouchingTopOfHead(hand, faceBounds)
          ).length
        : 0,
      sideHeadPalmContacts,
      topHeadPalmContacts,
      palmCenterXRatio: contactDiagnostics.map((diagnostic) => diagnostic.palmCenterXRatio),
      palmCenterYRatio: contactDiagnostics.map((diagnostic) => diagnostic.palmCenterYRatio),
      handHeightRatio: contactDiagnostics.map((diagnostic) => diagnostic.handHeightRatio),
      raisedHandsWithThumbs: hands.filter((hand) => isRaisedOpenPalm(hand) && hasExtendedThumb(hand)).length
    },
    face: {
      facePresent: faceLandmarks.length > 0,
      mouthOpen,
      eyeOpenness,
      browFurrow,
      squint,
      faceScale: faceBounds?.area ?? 0,
      mouthFrown,
      lookUp,
      tongueOut,
      smile,
      headTiltUp
    }
  };
}

function getBlendshape(categories: { categoryName: string; score: number }[], name: string): number {
  return categories.find((category) => category.categoryName === name)?.score ?? 0;
}

function average(...values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function deriveTongueOut(directTongueOut: number, mouthOpen: number, smile: number): number {
  if (directTongueOut > 0) {
    return directTongueOut;
  }

  if (mouthOpen < 0.08 || smile < 0.2) {
    return 0;
  }

  return roundRatio(Math.min(1, mouthOpen * 0.8 + smile * 0.175));
}

function getBounds(points: NormalizedLandmark[]): Bounds {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);

  return {
    left,
    right,
    top,
    bottom,
    area: Math.max(0, right - left) * Math.max(0, bottom - top)
  };
}

function isThumbsUp(hand: NormalizedLandmark[]): boolean {
  const thumbTip = hand[4];
  const thumbIp = hand[3];
  const indexTip = hand[8];
  const indexPip = hand[6];
  const middleTip = hand[12];
  const middlePip = hand[10];
  const ringTip = hand[16];
  const ringPip = hand[14];
  const pinkyTip = hand[20];
  const pinkyPip = hand[18];

  if (!thumbTip || !thumbIp || !indexTip || !indexPip || !middleTip || !middlePip || !ringTip || !ringPip || !pinkyTip || !pinkyPip) {
    return false;
  }

  const thumbRaised = thumbTip.y < thumbIp.y - 0.06;
  const fingersFolded =
    indexTip.y > indexPip.y &&
    middleTip.y > middlePip.y &&
    ringTip.y > ringPip.y &&
    pinkyTip.y > pinkyPip.y;

  return thumbRaised && fingersFolded;
}

function isHandNearFace(hand: NormalizedLandmark[], faceBounds: Bounds): boolean {
  const zone = getMouthChinZone(faceBounds);

  return hand.some((point) => isPointInZone(point, zone));
}

function isFingerNearMouth(hand: NormalizedLandmark[], faceBounds: Bounds): boolean {
  const wrist = hand[0];
  const indexMcp = hand[5];
  const indexTip = hand[8];
  if (!wrist || !indexMcp || !indexTip) {
    return false;
  }

  const zone = getMouthChinZone(faceBounds);
  if (!isPointInZone(indexTip, zone) || isRaisedOpenPalm(hand)) {
    return false;
  }

  const fingertips = [hand[4], hand[8], hand[12], hand[16], hand[20]].filter(
    (point): point is NormalizedLandmark => Boolean(point)
  );
  const fingertipsInMouthZone = countPointsInZone(fingertips, zone);
  const indexFingerLength = getDistance(indexTip, indexMcp);
  const indexLeadsHand = getDistance(indexTip, wrist) > getDistance(indexMcp, wrist);

  return fingertipsInMouthZone <= 2 && indexFingerLength > 0.045 && indexLeadsHand;
}

function getMouthChinZone(faceBounds: Bounds) {
  const width = faceBounds.right - faceBounds.left;
  const height = faceBounds.bottom - faceBounds.top;
  return {
    left: faceBounds.left + width * 0.22,
    right: faceBounds.right - width * 0.22,
    top: faceBounds.top + height * 0.56,
    bottom: faceBounds.bottom + height * 0.08
  };
}

function isRaisedOpenPalm(hand: NormalizedLandmark[]): boolean {
  const wrist = hand[0];
  const fingertips = [hand[4], hand[8], hand[12], hand[16], hand[20]];
  const fingerJoints = [hand[3], hand[6], hand[10], hand[14], hand[18]];

  if (!wrist || fingertips.some((point) => !point) || fingerJoints.some((point) => !point)) {
    return false;
  }

  const extendedFingers = fingertips.filter((tip, index) => tip!.y < fingerJoints[index]!.y - 0.01).length;
  const palmRaised = average(...fingertips.map((tip) => tip!.y)) < wrist.y - 0.01;

  return extendedFingers >= 4 && palmRaised;
}

function hasExtendedThumb(hand: NormalizedLandmark[]): boolean {
  const wrist = hand[0];
  const thumbTip = hand[4];
  const thumbIp = hand[3];
  if (!wrist || !thumbTip || !thumbIp) {
    return false;
  }

  const thumbSpread = Math.abs(thumbTip.x - thumbIp.x) > 0.015 || Math.abs(thumbTip.x - wrist.x) > 0.05;
  const thumbLifted = thumbTip.y < thumbIp.y + 0.02;
  return thumbSpread && thumbLifted;
}

function isHandOnHead(hand: NormalizedLandmark[], faceBounds: Bounds): boolean {
  const wrist = hand[0];
  if (!wrist) {
    return false;
  }

  const expanded = {
    left: faceBounds.left - 0.15,
    right: faceBounds.right + 0.15,
    top: faceBounds.top - 0.18,
    bottom: faceBounds.top + (faceBounds.bottom - faceBounds.top) * 0.42
  };

  return hand.some((point) =>
    point.x >= expanded.left &&
    point.x <= expanded.right &&
    point.y >= expanded.top &&
    point.y <= expanded.bottom
  );
}

function isPalmTouchingSideOfHead(hand: NormalizedLandmark[], faceBounds: Bounds): boolean {
  const palmPoints = [hand[0], hand[5], hand[9], hand[13], hand[17]].filter(
    (point): point is NormalizedLandmark => Boolean(point)
  );
  if (palmPoints.length < 5) {
    return false;
  }

  const width = faceBounds.right - faceBounds.left;
  const height = faceBounds.bottom - faceBounds.top;
  const leftSide = {
    left: faceBounds.left - width * 0.22,
    right: faceBounds.left + width * 0.1,
    top: faceBounds.top + height * 0.14,
    bottom: faceBounds.top + height * 0.58
  };
  const rightSide = {
    left: faceBounds.right - width * 0.1,
    right: faceBounds.right + width * 0.22,
    top: faceBounds.top + height * 0.14,
    bottom: faceBounds.top + height * 0.58
  };

  const palmCenter = {
    x: average(...palmPoints.map((point) => point.x)),
    y: average(...palmPoints.map((point) => point.y))
  };
  const contactZone = isPointInZone(palmCenter, leftSide) ? leftSide : isPointInZone(palmCenter, rightSide) ? rightSide : null;
  if (!contactZone) {
    return false;
  }

  const clusteredPalmPoints = palmPoints.filter((point) => isPointInZone(point, contactZone)).length;
  return clusteredPalmPoints >= 3;
}

function isPalmTouchingTopOfHead(hand: NormalizedLandmark[], faceBounds: Bounds): boolean {
  const palmPoints = getPalmPoints(hand);
  if (palmPoints.length < 5) {
    return false;
  }

  const width = faceBounds.right - faceBounds.left;
  const height = faceBounds.bottom - faceBounds.top;
  const topZone = {
    left: faceBounds.left - width * 1.2,
    right: faceBounds.right + width * 1.2,
    top: faceBounds.top - height * 0.2,
    bottom: faceBounds.top + height * 0.08
  };

  const palmCenter = {
    x: average(...palmPoints.map((point) => point.x)),
    y: average(...palmPoints.map((point) => point.y))
  };
  return isPointInZone(palmCenter, topZone) && countPointsInZone(palmPoints, topZone) >= 3;
}

function getHeadContactDiagnostics(hand: NormalizedLandmark[], faceBounds: Bounds) {
  const palmPoints = getPalmPoints(hand);
  const width = faceBounds.right - faceBounds.left;
  const height = faceBounds.bottom - faceBounds.top;
  const handBounds = getBounds(hand);

  if (palmPoints.length < 5) {
    return {
      palmCenterXRatio: 0,
      palmCenterYRatio: 0,
      handHeightRatio: roundRatio((handBounds.bottom - handBounds.top) / height)
    };
  }

  const palmCenter = {
    x: average(...palmPoints.map((point) => point.x)),
    y: average(...palmPoints.map((point) => point.y))
  };

  return {
    palmCenterXRatio: roundRatio((palmCenter.x - faceBounds.left) / width),
    palmCenterYRatio: roundRatio((palmCenter.y - faceBounds.top) / height),
    handHeightRatio: roundRatio((handBounds.bottom - handBounds.top) / height)
  };
}

function getPalmPoints(hand: NormalizedLandmark[]): NormalizedLandmark[] {
  return [hand[0], hand[5], hand[9], hand[13], hand[17]].filter(
    (point): point is NormalizedLandmark => Boolean(point)
  );
}

function countPointsInZone(points: NormalizedLandmark[], zone: { left: number; right: number; top: number; bottom: number }): number {
  return points.filter((point) => isPointInZone(point, zone)).length;
}

function getDistance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}

function isPointInZone(point: { x: number; y: number }, zone: { left: number; right: number; top: number; bottom: number }): boolean {
  return point.x >= zone.left &&
    point.x <= zone.right &&
    point.y >= zone.top &&
    point.y <= zone.bottom;
}

function getHeadTiltUp(points: NormalizedLandmark[]): number {
  const nose = points[1];
  const chin = points[152];
  const forehead = points[10];
  if (!nose || !chin || !forehead) {
    return 0;
  }

  const faceHeight = Math.max(0.0001, chin.y - forehead.y);
  const noseToChinRatio = (chin.y - nose.y) / faceHeight;
  return Math.max(0, noseToChinRatio - 0.45);
}
