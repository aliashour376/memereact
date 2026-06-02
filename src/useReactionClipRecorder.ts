import { useEffect, useRef, useState, type RefObject } from 'react';
import type { MemeAsset, MemeCategory } from './memeTypes.ts';
import type { ActiveReaction } from './reactionState.ts';

export type ClipLifecycle = 'disabled' | 'armed' | 'recording' | 'preview-ready' | 'discarded';

export interface ClipPreview {
  url: string;
  blob: Blob;
  category: MemeCategory;
  label: string;
  includesAudio: boolean;
  createdAt: Date;
}

interface UseReactionClipRecorderOptions {
  activeReaction: ActiveReaction | null;
  displayedMeme: MemeAsset | null;
  categoryLabels: Record<MemeCategory, string>;
  videoRef: RefObject<HTMLVideoElement | null>;
}

const clipDurationMs = 3000;
export const clipCanvasWidth = 1280;
export const clipCanvasHeight = 720;

export function useReactionClipRecorder({
  activeReaction,
  displayedMeme,
  categoryLabels,
  videoRef
}: UseReactionClipRecorderOptions) {
  const clipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingCancelledRef = useRef(false);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingFrameRef = useRef<number | null>(null);
  const lastRecordedReactionStartRef = useRef<number | null>(null);

  const [reactionClipsEnabled, setReactionClipsEnabled] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [clipLifecycle, setClipLifecycle] = useState<ClipLifecycle>('disabled');
  const [clipPreview, setClipPreview] = useState<ClipPreview | null>(null);
  const [clipMessage, setClipMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopRecording();
      stopMicrophoneStream();
    };
  }, []);

  useEffect(() => {
    if (!clipPreview) {
      return;
    }

    return () => {
      URL.revokeObjectURL(clipPreview.url);
    };
  }, [clipPreview]);

  useEffect(() => {
    if (!reactionClipsEnabled) {
      setClipLifecycle('disabled');
      setMicrophoneEnabled(false);
      setClipMessage(null);
      lastRecordedReactionStartRef.current = null;
      recordingCancelledRef.current = true;
      discardClip();
      stopRecording();
      stopMicrophoneStream();
      return;
    }

    if (clipLifecycle === 'disabled') {
      setClipLifecycle('armed');
    }
  }, [clipLifecycle, reactionClipsEnabled]);

  useEffect(() => {
    if (!activeReaction || !displayedMeme || !reactionClipsEnabled) {
      return;
    }

    if (displayedMeme.category !== activeReaction.category) {
      return;
    }

    if (lastRecordedReactionStartRef.current === activeReaction.startedAt) {
      return;
    }

    if (clipPreview || clipLifecycle === 'recording') {
      return;
    }

    lastRecordedReactionStartRef.current = activeReaction.startedAt;
    void startReactionClip(activeReaction, displayedMeme);
  }, [activeReaction, clipLifecycle, clipPreview, displayedMeme, reactionClipsEnabled]);

  function toggleReactionClips() {
    setReactionClipsEnabled((enabled) => !enabled);
  }

  function toggleMicrophone() {
    setMicrophoneEnabled((enabled) => !enabled);
  }

  function resetClipSession() {
    setClipMessage(null);
    lastRecordedReactionStartRef.current = null;
  }

  async function startReactionClip(reaction: ActiveReaction, meme: MemeAsset) {
    const video = videoRef.current;
    const canvas = clipCanvasRef.current;

    if (!video || !canvas || !window.MediaRecorder) {
      setClipMessage('Clip recording is not available in this browser.');
      setClipLifecycle(reactionClipsEnabled ? 'armed' : 'disabled');
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      setClipMessage('Clip export could not start.');
      setClipLifecycle(reactionClipsEnabled ? 'armed' : 'disabled');
      return;
    }

    discardClip();
    recordingCancelledRef.current = false;
    setClipLifecycle('recording');
    setClipMessage(null);

    let memeImage: HTMLImageElement;
    try {
      memeImage = await loadImage(meme.src);
    } catch {
      setClipMessage('Meme image was not ready for export.');
      setClipLifecycle(reactionClipsEnabled ? 'armed' : 'disabled');
      return;
    }

    const canvasStream = canvas.captureStream(30);
    let includesAudio = microphoneEnabled;

    if (includesAudio) {
      try {
        const microphoneStream = await getMicrophoneStream();
        microphoneStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
      } catch {
        includesAudio = false;
        setClipMessage('Microphone unavailable; recording video only.');
      }
    }

    const mimeType = getSupportedWebmMimeType();
    const recorder = mimeType ? new MediaRecorder(canvasStream, { mimeType }) : new MediaRecorder(canvasStream);
    const chunks: BlobPart[] = [];
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstart = () => {
      recordingTimerRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, clipDurationMs);
    };

    recorder.onstop = () => {
      stopDrawingLoop();
      stopTimer();
      canvasStream.getTracks().forEach((track) => track.stop());
      stopMicrophoneStream();
      recorderRef.current = null;

      if (recordingCancelledRef.current) {
        setClipLifecycle('disabled');
        return;
      }

      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      setClipPreview({
        url,
        blob,
        category: reaction.category,
        label: categoryLabels[reaction.category],
        includesAudio,
        createdAt: new Date()
      });
      setClipLifecycle('preview-ready');
      setClipMessage(null);
    };

    const drawFrame = () => {
      drawClipFrame(context, canvas, video, memeImage, categoryLabels[reaction.category]);
      recordingFrameRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();
    recorder.start();
  }

  async function getMicrophoneStream() {
    if (microphoneStreamRef.current) {
      return microphoneStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      },
      video: false
    });

    microphoneStreamRef.current = stream;
    return stream;
  }

  function stopRecording() {
    recordingCancelledRef.current = true;
    stopDrawingLoop();
    stopTimer();

    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  }

  function stopDrawingLoop() {
    if (recordingFrameRef.current !== null) {
      cancelAnimationFrame(recordingFrameRef.current);
      recordingFrameRef.current = null;
    }
  }

  function stopTimer() {
    if (recordingTimerRef.current !== null) {
      window.clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function stopMicrophoneStream() {
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;
  }

  function discardClip() {
    lastRecordedReactionStartRef.current = activeReaction?.startedAt ?? lastRecordedReactionStartRef.current;

    setClipPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current.url);
      }

      return null;
    });

    setClipLifecycle(reactionClipsEnabled ? 'discarded' : 'disabled');
  }

  function prepareNextClip() {
    lastRecordedReactionStartRef.current = activeReaction?.startedAt ?? lastRecordedReactionStartRef.current;

    setClipPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current.url);
      }

      return null;
    });

    setClipMessage(null);
    setClipLifecycle(reactionClipsEnabled ? 'armed' : 'disabled');
  }

  function downloadClip() {
    if (!clipPreview) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = clipPreview.url;
    anchor.download = createClipFileName(clipPreview);
    anchor.click();
  }

  return {
    clipCanvasRef,
    reactionClipsEnabled,
    microphoneEnabled,
    clipLifecycle,
    clipPreview,
    clipMessage,
    toggleReactionClips,
    toggleMicrophone,
    discardClip,
    prepareNextClip,
    downloadClip,
    resetClipSession,
    stopRecording,
    stopMicrophoneStream
  };
}

export function createClipFileName(clip: Pick<ClipPreview, 'category' | 'createdAt' | 'includesAudio'>): string {
  const timestamp = clip.createdAt.toISOString()
    .replace(/\.\d{3}Z$/, '')
    .replace(/[:T]/g, '-');

  return `meme-react-${clip.category}-${timestamp}${clip.includesAudio ? '-mic' : ''}.webm`;
}

export function formatClipTimestamp(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSupportedWebmMimeType(): string {
  const supportedTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];

  return supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image failed to load.'));
    image.src = src;
  });
}

function drawClipFrame(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  memeImage: HTMLImageElement,
  label: string
) {
  const width = canvas.width;
  const height = canvas.height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = '#050607';
  context.fillRect(0, 0, width, height);

  drawVideoCover(context, video, width, height);

  const cinematicWash = context.createLinearGradient(0, 0, width, height);
  cinematicWash.addColorStop(0, 'rgba(14, 33, 28, 0.34)');
  cinematicWash.addColorStop(0.42, 'rgba(0, 0, 0, 0.02)');
  cinematicWash.addColorStop(1, 'rgba(62, 34, 22, 0.38)');
  context.fillStyle = cinematicWash;
  context.fillRect(0, 0, width, height);

  const vignette = context.createRadialGradient(width * 0.48, height * 0.38, height * 0.14, width * 0.48, height * 0.38, width * 0.78);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  const lowerShade = context.createLinearGradient(0, height * 0.52, 0, height);
  lowerShade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  lowerShade.addColorStop(1, 'rgba(0, 0, 0, 0.82)');
  context.fillStyle = lowerShade;
  context.fillRect(0, 0, width, height);

  const memeBoxWidth = Math.round(width * 0.24);
  const memeBoxHeight = Math.round(height * 0.36);
  const memeBoxX = width - memeBoxWidth - 56;
  const memeBoxY = height - memeBoxHeight - 62;
  const memeInset = 8;

  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.46)';
  context.shadowBlur = 24;
  context.shadowOffsetY = 10;
  context.fillStyle = 'rgba(8, 10, 13, 0.74)';
  fillRoundRect(context, memeBoxX, memeBoxY, memeBoxWidth, memeBoxHeight, 8);
  context.restore();

  context.save();
  roundedClip(context, memeBoxX + memeInset, memeBoxY + memeInset, memeBoxWidth - memeInset * 2, memeBoxHeight - memeInset * 2, 6);
  drawImageCover(context, memeImage, memeBoxX + memeInset, memeBoxY + memeInset, memeBoxWidth - memeInset * 2, memeBoxHeight - memeInset * 2);

  const memeImageShade = context.createLinearGradient(0, memeBoxY + memeBoxHeight * 0.54, 0, memeBoxY + memeBoxHeight);
  memeImageShade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  memeImageShade.addColorStop(1, 'rgba(0, 0, 0, 0.48)');
  context.fillStyle = memeImageShade;
  context.fillRect(memeBoxX + memeInset, memeBoxY + memeInset, memeBoxWidth - memeInset * 2, memeBoxHeight - memeInset * 2);
  context.restore();

  context.strokeStyle = 'rgba(246, 242, 234, 0.58)';
  context.lineWidth = 1.5;
  strokeRoundRect(context, memeBoxX, memeBoxY, memeBoxWidth, memeBoxHeight, 8);

  const titleAreaRight = memeBoxX - 40;
  const titleX = 56;
  const titleY = height - 104;
  const titleMaxWidth = titleAreaRight - titleX;
  const title = label.toUpperCase();
  const titleFontSize = getFittingFontSize(context, title, titleMaxWidth, 42, 26, '850');

  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.64)';
  context.shadowBlur = 12;
  context.shadowOffsetY = 3;
  context.fillStyle = '#fffdf8';
  context.font = `850 ${titleFontSize}px Inter, system-ui, sans-serif`;
  context.textBaseline = 'alphabetic';
  context.fillText(title, titleX, titleY + titleFontSize);
  context.restore();

  context.fillStyle = '#7df0b1';
  context.fillRect(titleX, titleY - 12, Math.min(104, titleMaxWidth), 3);

  context.font = '800 17px Inter, system-ui, sans-serif';
  context.textBaseline = 'middle';
  const chipText = 'MEME REACT';
  const chipPaddingX = 12;
  const chipWidth = Math.ceil(context.measureText(chipText).width + chipPaddingX * 2);
  const chipHeight = 30;
  const chipX = titleX;
  const chipY = titleY + titleFontSize + 12;

  context.fillStyle = 'rgba(8, 10, 13, 0.58)';
  fillRoundRect(context, chipX, chipY, chipWidth, chipHeight, 6);
  context.strokeStyle = 'rgba(246, 242, 234, 0.28)';
  context.lineWidth = 1;
  strokeRoundRect(context, chipX, chipY, chipWidth, chipHeight, 6);
  context.fillStyle = 'rgba(246, 242, 234, 0.84)';
  context.fillText(chipText, chipX + chipPaddingX, chipY + chipHeight / 2);
}

function getFittingFontSize(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  weight: string
) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    context.font = `${weight} ${size}px Inter, system-ui, sans-serif`;

    if (context.measureText(text).width <= maxWidth) {
      return size;
    }
  }

  return minSize;
}

function drawVideoCover(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number
) {
  const sourceWidth = video.videoWidth || width;
  const sourceHeight = video.videoHeight || height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }

  context.save();
  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
  context.restore();
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;

  if (sourceRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio;
    sx = (image.naturalWidth - sw) / 2;
  } else {
    sh = image.naturalWidth / targetRatio;
    sy = (image.naturalHeight - sh) / 2;
  }

  context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function roundedClip(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  makeRoundRectPath(context, x, y, width, height, radius);
  context.clip();
}

function fillRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  makeRoundRectPath(context, x, y, width, height, radius);
  context.fill();
}

function strokeRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  makeRoundRectPath(context, x, y, width, height, radius);
  context.stroke();
}

function makeRoundRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const nextRadius = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + nextRadius, y);
  context.lineTo(x + width - nextRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + nextRadius);
  context.lineTo(x + width, y + height - nextRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - nextRadius, y + height);
  context.lineTo(x + nextRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - nextRadius);
  context.lineTo(x, y + nextRadius);
  context.quadraticCurveTo(x, y, x + nextRadius, y);
}
