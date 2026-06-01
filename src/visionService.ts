import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  type FaceLandmarkerResult,
  type HandLandmarkerResult
} from '@mediapipe/tasks-vision';

export interface VisionResults {
  hands: HandLandmarkerResult | null;
  face: FaceLandmarkerResult | null;
}

export interface VisionService {
  detect: (video: HTMLVideoElement, timestamp: number) => VisionResults;
  close: () => void;
}

const wasmRoot = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const handModel = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const faceModel = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

export async function createVisionService(): Promise<VisionService> {
  const vision = await FilesetResolver.forVisionTasks(wasmRoot);
  const [hands, face] = await Promise.all([
    HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: handModel,
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.55
    }),
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: faceModel,
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    })
  ]);

  return {
    detect(video: HTMLVideoElement, timestamp: number) {
      return {
        hands: hands.detectForVideo(video, timestamp),
        face: face.detectForVideo(video, timestamp)
      };
    },
    close() {
      hands.close();
      face.close();
    }
  };
}
