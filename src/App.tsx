import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Download, Eye, Mic, MicOff, Sparkles, Trash2, Video, VideoOff } from 'lucide-react';
import {
  createCalibrationSession,
  normalizeSignals,
  toCalibrationSample,
  type CalibrationBaseline,
  type NormalizedSignals
} from './calibration.ts';
import { localMemeCatalog } from './generated/memeCatalog.ts';
import { createLocalMemeSource } from './memeLibrary.ts';
import { memeCategories, type MemeAsset, type MemeCategory } from './memeTypes.ts';
import {
  appendPoseCaptureSamples,
  createEmptyPoseDataset,
  createPoseCaptureSample,
  getPoseCaptureCounts,
  parsePoseCaptureDataset,
  removePoseCapturesForCategory,
  scoreAllCapturedPoses,
  scoreCapturedPose,
  type PoseCaptureDataset,
  type PoseCaptureLabel,
  type PoseCaptureSample
} from './poseCapture.ts';
import { evaluatePoseGuide, type PoseGuideCheck } from './poseGuide.ts';
import { evaluateReactionRules, type ReactionCandidate } from './reactionRules.ts';
import { createReactionController, type ActiveReaction } from './reactionState.ts';
import { createVisionService, type VisionService } from './visionService.ts';
import { loadWithTimeout } from './visionLoader.ts';
import { deriveVisionSignals, neutralSignals, type VisionSignals } from './visionSignals.ts';
import {
  clipCanvasHeight,
  clipCanvasWidth,
  formatBytes,
  formatClipTimestamp,
  useReactionClipRecorder
} from './useReactionClipRecorder.ts';

type AppStatus = 'idle' | 'requesting-camera' | 'loading-models' | 'calibrating' | 'live' | 'error';
type AppMode = 'react' | 'guide';

interface PoseCaptureRun {
  category: MemeCategory;
  label: PoseCaptureLabel;
  startedAt: number;
  endsAt: number;
  lastCapturedAt: number;
  lastUiUpdatedAt: number;
  samples: PoseCaptureSample[];
}

const poseCaptureStorageKey = 'memereact.poseCaptureDataset.v1';
const poseCapturePrepMs = 3000;
const poseCaptureDurationMs = 2600;
const poseCaptureFrameIntervalMs = 90;
const poseCaptureUiIntervalMs = 100;
const defaultCapturedPoseCandidateThreshold = 0.62;
const capturedPoseCandidateThresholds: Partial<Record<MemeCategory, number>> = {
  'lets-larp': 0.28
};
const handRequiredCapturedCategories = new Set<MemeCategory>(['lets-larp', 'no-idea-cuh', 'son']);
const minimumHandVisiblePercentByCategory: Partial<Record<MemeCategory, number>> = {
  'lets-larp': 20,
  'no-idea-cuh': 70,
  son: 70
};

const categoryLabels: Record<MemeCategory, string> = {
  'absolute-cinema': 'Absolute cinema',
  'we-are-cooked': 'We are cooked',
  'ah-hell-nah': 'Ah hell nah',
  thinking: 'Thinking',
  happy: 'Happy',
  'lets-larp': 'Lets larp',
  'no-idea-cuh': 'No idea cuh',
  son: 'Son',
  tf: 'TF',
  zoltraak: 'Zoltraak'
};

const guideStatusLabels = {
  waiting: 'Waiting',
  searching: 'Searching',
  close: 'Close',
  matched: 'Matched'
} as const;

const neutralNormalizedSignals: NormalizedSignals = {
  hands: neutralSignals.hands,
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
    headTiltUpDelta: 0,
    headTiltDownDelta: 0,
    headTiltSideDelta: 0,
    tongueOutDelta: 0,
    smileDelta: 0
  }
};

export function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const serviceRef = useRef<VisionService | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const baselineRef = useRef<CalibrationBaseline | null>(null);
  const calibrationRef = useRef(createCalibrationSession(30));
  const controllerRef = useRef(createReactionController({
    stabilityMs: 260,
    holdMs: 1200,
    cooldownMs: 260
  }));
  const memeSourceRef = useRef(createLocalMemeSource(localMemeCatalog));
  const poseDatasetRef = useRef<PoseCaptureDataset>(loadPoseCaptureDataset());
  const poseCaptureRunRef = useRef<PoseCaptureRun | null>(null);

  const [status, setStatus] = useState<AppStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [baseline, setBaseline] = useState<CalibrationBaseline | null>(null);
  const [rawSignals, setRawSignals] = useState<VisionSignals>(neutralSignals);
  const [normalizedSignals, setNormalizedSignals] = useState<NormalizedSignals>(neutralNormalizedSignals);
  const [candidates, setCandidates] = useState<ReactionCandidate[]>([]);
  const [activeReaction, setActiveReaction] = useState<ActiveReaction | null>(null);
  const [displayedMeme, setDisplayedMeme] = useState<MemeAsset | null>(null);
  const [appMode, setAppMode] = useState<AppMode>('react');
  const [guideTarget, setGuideTarget] = useState<MemeCategory>('absolute-cinema');
  const [guideMeme, setGuideMeme] = useState<MemeAsset | null>(null);
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [poseDataset, setPoseDataset] = useState<PoseCaptureDataset>(() => poseDatasetRef.current);
  const [poseCaptureTarget, setPoseCaptureTarget] = useState<MemeCategory>('lets-larp');
  const [poseCaptureRun, setPoseCaptureRun] = useState<PoseCaptureRun | null>(null);
  const [poseCaptureMessage, setPoseCaptureMessage] = useState('Capture good and bad examples for hard poses.');
  const recordableReaction = appMode === 'react' ? activeReaction : null;
  const {
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
  } = useReactionClipRecorder({
    activeReaction: recordableReaction,
    displayedMeme,
    categoryLabels,
    videoRef
  });

  const guideMatch = useMemo(
    () => evaluatePoseGuide(normalizedSignals, guideTarget),
    [guideTarget, normalizedSignals]
  );
  const visibleGuideChecks = useMemo(
    () => getVisibleGuideChecks(guideMatch.checks),
    [guideMatch.checks]
  );
  const panelMeme = appMode === 'guide' ? guideMeme : displayedMeme;
  const poseCaptureCounts = useMemo(
    () => getPoseCaptureCounts(poseDataset, poseCaptureTarget),
    [poseDataset, poseCaptureTarget]
  );
  const capturedPoseScores = useMemo(
    () => scoreAllCapturedPoses(poseDataset, normalizedSignals),
    [normalizedSignals, poseDataset]
  );
  const selectedCapturedPoseScore = useMemo(
    () => scoreCapturedPose(poseDataset, poseCaptureTarget, normalizedSignals),
    [normalizedSignals, poseCaptureTarget, poseDataset]
  );
  const poseCaptureNow = poseCaptureRun ? performance.now() : 0;
  const poseCaptureIsPreparing = Boolean(poseCaptureRun && poseCaptureNow < poseCaptureRun.startedAt);
  const poseCaptureCountdown = poseCaptureRun
    ? Math.max(0, Math.ceil((poseCaptureRun.startedAt - poseCaptureNow) / 1000))
    : 0;
  const poseCaptureProgress = poseCaptureRun
    ? poseCaptureIsPreparing
      ? Math.round(clamp((poseCapturePrepMs - (poseCaptureRun.startedAt - poseCaptureNow)) / poseCapturePrepMs, 0, 1) * 100)
      : Math.round(clamp((poseCaptureNow - poseCaptureRun.startedAt) / poseCaptureDurationMs, 0, 1) * 100)
    : 0;

  const statusLabel = useMemo(() => {
    if (status === 'requesting-camera') return 'Requesting camera';
    if (status === 'loading-models') return 'Loading vision';
    if (status === 'calibrating') return `Calibrating ${Math.round(calibrationProgress * 100)}%`;
    if (status === 'live') return 'Live';
    if (status === 'error') return 'Needs attention';
    return 'Ready';
  }, [calibrationProgress, status]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      stopRecording();
      serviceRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      stopMicrophoneStream();
    };
  }, []);

  useEffect(() => {
    poseDatasetRef.current = poseDataset;
    savePoseCaptureDataset(poseDataset);
  }, [poseDataset]);

  useEffect(() => {
    if (!activeReaction) {
      setDisplayedMeme(null);
      return;
    }

    let cancelled = false;
    memeSourceRef.current.getRandom(activeReaction.category).then((meme) => {
      if (!cancelled) {
        setDisplayedMeme(meme);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeReaction]);

  useEffect(() => {
    let cancelled = false;

    memeSourceRef.current.getRandom(guideTarget).then((meme) => {
      if (!cancelled) {
        setGuideMeme(meme);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [guideTarget]);

  async function startExperience() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    try {
      resetSessionState();
      setError(null);
      setStatus('requesting-camera');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      setStatus('loading-models');
      serviceRef.current = await loadWithTimeout(
        createVisionService,
        30000,
        'Vision models took too long to load. Check your connection and try again.'
      );
      setStatus('calibrating');
      runVisionLoop();
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'Could not start camera or vision models.');
    }
  }

  function runVisionLoop() {
    const tick = (timestamp: number) => {
      const video = videoRef.current;
      const service = serviceRef.current;

      if (video && service && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const results = service.detect(video, timestamp);
        const nextRawSignals = deriveVisionSignals(results.hands, results.face);
        setRawSignals(nextRawSignals);

        const currentBaseline = baselineRef.current;
        if (!currentBaseline) {
          const sample = toCalibrationSample(nextRawSignals);
          if (sample) {
            calibrationRef.current.addSample(sample);
            setCalibrationProgress(calibrationRef.current.getProgress());

            if (calibrationRef.current.isComplete()) {
              const nextBaseline = calibrationRef.current.getBaseline();
              baselineRef.current = nextBaseline;
              setBaseline(nextBaseline);
              setStatus('live');
            }
          }
        } else {
          const nextNormalizedSignals = normalizeSignals(nextRawSignals, currentBaseline);
          recordPoseCaptureFrame(nextNormalizedSignals, timestamp);

          const nextCandidates = mergeReactionCandidates(
            evaluateReactionRules(nextNormalizedSignals),
            getCapturedPoseCandidates(nextNormalizedSignals)
          );
          const invalidatedCategories = new Set<MemeCategory>();
          const nextReactionState = controllerRef.current.update(nextCandidates, timestamp, invalidatedCategories);

          setNormalizedSignals(nextNormalizedSignals);
          setCandidates(nextCandidates);
          setActiveReaction(nextReactionState.activeReaction);
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }

  function getCapturedPoseCandidates(signals: NormalizedSignals): ReactionCandidate[] {
    return scoreAllCapturedPoses(poseDatasetRef.current, signals)
      .filter((score) => isCapturedPoseCandidateAllowed(score.category, signals))
      .filter((score) => score.score >= getCapturedPoseCandidateThreshold(score.category))
      .map((score) => ({
        category: score.category,
        score: score.score,
        reason: 'captured pose model'
      }));
  }

  function recordPoseCaptureFrame(signals: NormalizedSignals, timestamp: number) {
    const run = poseCaptureRunRef.current;
    if (!run) {
      return;
    }

    if (timestamp - run.lastUiUpdatedAt >= poseCaptureUiIntervalMs) {
      run.lastUiUpdatedAt = timestamp;
      setPoseCaptureRun({ ...run, samples: [...run.samples] });
    }

    if (timestamp < run.startedAt) {
      return;
    }

    if (timestamp - run.lastCapturedAt >= poseCaptureFrameIntervalMs && timestamp <= run.endsAt) {
      run.samples.push(createPoseCaptureSample(run.category, run.label, signals));
      run.lastCapturedAt = timestamp;
      setPoseCaptureRun({ ...run, samples: [...run.samples] });
    }

    if (timestamp >= run.endsAt) {
      finishPoseCaptureRun();
    }
  }

  function finishPoseCaptureRun() {
    const run = poseCaptureRunRef.current;
    if (!run) {
      return;
    }

    poseCaptureRunRef.current = null;
    setPoseCaptureRun(null);

    if (run.samples.length === 0) {
      setPoseCaptureMessage('No live frames were captured. Start the camera and try again.');
      return;
    }

    const quality = getPoseCaptureQuality(run);
    if (!quality.accepted) {
      setPoseCaptureMessage(quality.message);
      return;
    }

    setPoseDataset((current) => appendPoseCaptureSamples(current, run.samples));
    setPoseCaptureMessage(
      `Saved ${run.samples.length} ${run.label} samples for ${categoryLabels[run.category]}. ${quality.message}`
    );
  }

  async function previewCategory(category: MemeCategory) {
    setDisplayedMeme(await memeSourceRef.current.getRandom(category));
  }

  function startPoseCapture(label: PoseCaptureLabel) {
    if (status !== 'live') {
      setPoseCaptureMessage('Start the camera and finish calibration before recording pose examples.');
      return;
    }

    if (poseCaptureRunRef.current) {
      return;
    }

    const now = performance.now();
    const startedAt = now + poseCapturePrepMs;
    const run: PoseCaptureRun = {
      category: poseCaptureTarget,
      label,
      startedAt,
      endsAt: startedAt + poseCaptureDurationMs,
      lastCapturedAt: startedAt - poseCaptureFrameIntervalMs,
      lastUiUpdatedAt: now,
      samples: []
    };

    poseCaptureRunRef.current = run;
    setPoseCaptureRun(run);
    setPoseCaptureMessage(`Get into the ${categoryLabels[poseCaptureTarget]} ${label} pose. Capture starts in 3 seconds.`);
  }

  async function copyPoseDataset() {
    const serialized = JSON.stringify(poseDataset, null, 2);
    try {
      await navigator.clipboard.writeText(serialized);
      setPoseCaptureMessage('Copied pose dataset JSON to clipboard.');
    } catch {
      setPoseCaptureMessage('Clipboard copy failed. Use Download dataset instead.');
    }
  }

  function downloadPoseDataset() {
    const blob = new Blob([JSON.stringify(poseDataset, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `memereact-pose-dataset-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setPoseCaptureMessage('Downloaded pose dataset JSON.');
  }

  function importPoseDataset(file: File | null) {
    if (!file) {
      return;
    }

    file.text().then((value) => {
      const parsed = parsePoseCaptureDataset(value);
      if (!parsed) {
        setPoseCaptureMessage('That file is not a valid Meme React pose dataset.');
        return;
      }

      setPoseDataset(parsed);
      setPoseCaptureMessage(`Imported ${parsed.samples.length} pose samples.`);
    });
  }

  function clearPoseCaptureTarget() {
    const counts = getPoseCaptureCounts(poseDataset, poseCaptureTarget);
    if (counts.good + counts.bad === 0) {
      setPoseCaptureMessage(`No saved examples for ${categoryLabels[poseCaptureTarget]}.`);
      return;
    }

    const confirmed = window.confirm(`Clear all captured pose examples for ${categoryLabels[poseCaptureTarget]}?`);
    if (!confirmed) {
      return;
    }

    setPoseDataset((current) => removePoseCapturesForCategory(current, poseCaptureTarget));
    setPoseCaptureMessage(`Cleared captured examples for ${categoryLabels[poseCaptureTarget]}.`);
  }

  function switchMode(nextMode: AppMode) {
    if (clipLifecycle === 'recording') {
      return;
    }

    setAppMode(nextMode);
  }

  function resetSessionState() {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    serviceRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());

    frameRef.current = null;
    serviceRef.current = null;
    streamRef.current = null;
    baselineRef.current = null;
    calibrationRef.current = createCalibrationSession(30);
    controllerRef.current = createReactionController({
      stabilityMs: 260,
      holdMs: 1200,
      cooldownMs: 260
    });
    poseCaptureRunRef.current = null;

    setCalibrationProgress(0);
    setBaseline(null);
    setRawSignals(neutralSignals);
    setNormalizedSignals(neutralNormalizedSignals);
    setCandidates([]);
    setActiveReaction(null);
    setDisplayedMeme(null);
    setPoseCaptureRun(null);
    resetClipSession();
  }

  return (
    <main className="app-shell">
      <section className="workspace" aria-label="Meme React workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Meme React</p>
            <h1>{appMode === 'guide' ? 'Pose guide' : 'Reaction cam'}</h1>
          </div>
          <div className="topbar-actions">
            <div className="mode-tabs" role="tablist" aria-label="Mode">
              <button
                type="button"
                role="tab"
                aria-selected={appMode === 'react'}
                className={appMode === 'react' ? 'is-active' : ''}
                disabled={clipLifecycle === 'recording'}
                onClick={() => switchMode('react')}
              >
                <Video size={16} />
                React
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={appMode === 'guide'}
                className={appMode === 'guide' ? 'is-active' : ''}
                disabled={clipLifecycle === 'recording'}
                onClick={() => switchMode('guide')}
              >
                <Eye size={16} />
                Guide
              </button>
            </div>
            <div className={`status-pill status-${status}`}>
              <span />
              {statusLabel}
            </div>
          </div>
        </header>

        <section className={`live-grid ${appMode === 'guide' ? 'has-guide-dock' : 'has-recording-dock'}`}>
          {appMode === 'react' ? (
            <aside className="recording-dock" aria-label="Recording controls">
              <div className="panel-head">
                <Video size={18} />
                <span>Recording</span>
              </div>
              <div className="recording-drawer">
                <div className="clip-panel">
                  <div className="clip-toggle-row">
                    <button
                      className={`mode-toggle ${reactionClipsEnabled ? 'is-on' : ''}`}
                      type="button"
                      role="switch"
                      aria-checked={reactionClipsEnabled}
                      onClick={toggleReactionClips}
                    >
                      {reactionClipsEnabled ? <Video size={17} /> : <VideoOff size={17} />}
                      Reaction clips: {reactionClipsEnabled ? 'On' : 'Off'}
                    </button>
                    {reactionClipsEnabled && (
                      <button
                        className={`mode-toggle ${microphoneEnabled ? 'is-on' : ''}`}
                        type="button"
                        role="switch"
                        aria-checked={microphoneEnabled}
                        onClick={toggleMicrophone}
                      >
                        {microphoneEnabled ? <Mic size={17} /> : <MicOff size={17} />}
                        Microphone: {microphoneEnabled ? 'On' : 'Off'}
                      </button>
                    )}
                  </div>
                  <div className={`clip-state clip-state-${clipLifecycle}`}>
                    {clipLifecycle === 'recording' ? (
                      <>
                        <span className="recording-dot" />
                        {microphoneEnabled ? 'Recording video + mic' : 'Recording video'}
                      </>
                    ) : clipLifecycle === 'preview-ready' && clipPreview ? (
                      <span>Latest clip ready</span>
                    ) : reactionClipsEnabled ? (
                      <span>Reaction clips armed</span>
                    ) : (
                      <span>Reaction clips off</span>
                    )}
                  </div>
                  {clipMessage && <p className="clip-message">{clipMessage}</p>}
                  <div className={`clip-preview ${clipPreview ? 'has-clip' : ''}`}>
                    {clipPreview ? (
                      <>
                        <div className="clip-preview-head">
                          <div>
                            <strong>{clipPreview.label}</strong>
                            <span>{formatClipTimestamp(clipPreview.createdAt)} · 3 sec · {clipPreview.includesAudio ? 'video + mic' : 'video only'}</span>
                          </div>
                          <span>{formatBytes(clipPreview.blob.size)}</span>
                        </div>
                        <video src={clipPreview.url} controls playsInline />
                        <div className="clip-actions">
                          <button type="button" onClick={downloadClip}>
                            <Download size={16} />
                            Download
                          </button>
                          <button type="button" onClick={prepareNextClip}>
                            <Video size={16} />
                            Record next
                          </button>
                          <button type="button" onClick={discardClip}>
                            <Trash2 size={16} />
                            Discard
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="clip-preview-empty">No clip yet</div>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          ) : (
            <aside className="guide-dock" aria-label="Pose guide controls">
              <div className="panel-head">
                <Eye size={18} />
                <span>Guide</span>
              </div>
              <div className="guide-panel">
                <div className="guide-targets">
                  {memeCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={guideTarget === category ? 'is-active' : ''}
                      aria-pressed={guideTarget === category}
                      onClick={() => setGuideTarget(category)}
                    >
                      {categoryLabels[category]}
                    </button>
                  ))}
                </div>
                <div className={`guide-meter guide-meter-${guideMatch.status}`}>
                  <div>
                    <strong>{guideStatusLabels[guideMatch.status]}</strong>
                    <span>{Math.round(guideMatch.score * 100)}%</span>
                  </div>
                  <span className="guide-meter-track">
                    <span style={{ width: `${Math.round(guideMatch.score * 100)}%` }} />
                  </span>
                </div>
                <div className={`guide-hint guide-hint-${guideMatch.status}`}>
                  <span>Next move</span>
                  <strong>{guideMatch.hint}</strong>
                </div>
                <div className="guide-checks">
                  {visibleGuideChecks.map((check) => (
                    <div key={check.label} className={check.met ? 'is-met' : ''}>
                      <span>{check.label}</span>
                      <strong>{Math.round(check.progress * 100)}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}

          <div className="camera-panel">
            <video ref={videoRef} className="camera-feed" playsInline muted />
            <canvas
              ref={clipCanvasRef}
              className="clip-canvas"
              width={clipCanvasWidth}
              height={clipCanvasHeight}
              aria-hidden="true"
            />
            <div className="camera-overlay">
              <div className="reticle" />
              <div className="camera-label">
                <Camera size={16} />
                Camera
              </div>
              {clipLifecycle === 'recording' && (
                <div className="recording-badge" role="status">
                  <span />
                  {microphoneEnabled ? 'Recording video + mic' : 'Recording video'}
                </div>
              )}
              {appMode === 'guide' && status === 'live' && (
                <div className={`guide-badge guide-badge-${guideMatch.status}`} role="status">
                  {guideStatusLabels[guideMatch.status]} · {Math.round(guideMatch.score * 100)}%
                </div>
              )}
              {poseCaptureRun && (
                <div className={`pose-capture-badge ${poseCaptureIsPreparing ? 'is-preparing' : 'is-recording'}`} role="status">
                  <span />
                  {poseCaptureIsPreparing
                    ? `Get ready ${poseCaptureCountdown}`
                    : `Capturing ${poseCaptureRun.label} ${poseCaptureProgress}%`}
                </div>
              )}
            </div>

            {status !== 'live' && (
              <div className="start-layer">
                <div className="start-card">
                  {status === 'calibrating' ? (
                    <div className="calibration-meter" aria-label="Calibration progress">
                      <span style={{ width: `${Math.round(calibrationProgress * 100)}%` }} />
                    </div>
                  ) : status === 'requesting-camera' || status === 'loading-models' ? (
                    <div className="loading-state" role="status">
                      <span />
                      {status === 'requesting-camera' ? 'Requesting camera' : 'Loading vision'}
                    </div>
                  ) : (
                    <button
                      className="primary-button"
                      onClick={startExperience}
                    >
                      <Eye size={18} />
                      {status === 'error' ? 'Retry' : 'Start'}
                    </button>
                  )}
                  {error && <p className="error-text">{error}</p>}
                </div>
              </div>
            )}

          </div>

          <aside className="meme-panel">
            <div className="panel-head">
              <Sparkles size={18} />
              <span>{appMode === 'guide' ? `Target: ${categoryLabels[guideTarget]}` : displayedMeme ? categoryLabels[displayedMeme.category] : 'Waiting'}</span>
            </div>
            <div className={`meme-frame ${panelMeme ? 'is-active' : ''}`}>
              {panelMeme ? (
                <img key={panelMeme.id} src={panelMeme.src} alt={`${categoryLabels[panelMeme.category]} meme`} />
              ) : (
                <div className="meme-empty">No reaction</div>
              )}
            </div>
            <div className="reaction-meta">
              {appMode === 'guide' ? (
                <>
                  <strong>{Math.round(guideMatch.score * 100)}% match</strong>
                  <span>{baseline ? guideStatusLabels[guideMatch.status] : 'Not calibrated'}</span>
                </>
              ) : (
                <>
                  <strong>{activeReaction ? categoryLabels[activeReaction.category] : 'Neutral'}</strong>
                  <span>{activeReaction ? activeReaction.reason : baseline ? 'Listening' : 'Not calibrated'}</span>
                </>
              )}
            </div>
          </aside>
          <p className="privacy-strip">
            {appMode === 'guide'
              ? 'Camera preview stays on this device. Guide matching runs locally from the same live pose signals.'
              : `Camera preview stays on this device. When reaction clips are enabled, a locked reaction saves one short local clip. Nothing is uploaded.${microphoneEnabled ? ' Microphone audio is included only while Microphone is On.' : ''}`}
          </p>
        </section>

        <section className="developer-panel">
          <button className="developer-toggle" onClick={() => setDeveloperOpen((open) => !open)}>
            <span>Developer</span>
            {developerOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {developerOpen && (
            <div className="developer-body">
              <div className="pose-capture-panel">
                <div className="pose-capture-head">
                  <div>
                    <span>Captured pose model</span>
                    <strong>{categoryLabels[poseCaptureTarget]}</strong>
                  </div>
                  <Sparkles size={20} />
                </div>
                <div className="pose-capture-controls">
                  <label>
                    Target
                    <select
                      value={poseCaptureTarget}
                      disabled={Boolean(poseCaptureRun)}
                      onChange={(event) => setPoseCaptureTarget(event.target.value as MemeCategory)}
                    >
                      {memeCategories.map((category) => (
                        <option key={category} value={category}>{categoryLabels[category]}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={Boolean(poseCaptureRun) || status !== 'live'}
                    onClick={() => startPoseCapture('good')}
                  >
                    Record good
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(poseCaptureRun) || status !== 'live'}
                    onClick={() => startPoseCapture('bad')}
                  >
                    Record bad
                  </button>
                </div>
                <div className="pose-capture-meter">
                  <div>
                    <span>
                      {poseCaptureRun
                        ? poseCaptureIsPreparing
                          ? `Get ready for ${poseCaptureRun.label}`
                          : `Capturing ${poseCaptureRun.label}`
                        : 'Model score'}
                    </span>
                    <strong>
                      {poseCaptureRun
                        ? poseCaptureIsPreparing
                          ? `${poseCaptureCountdown}s`
                          : `${poseCaptureProgress}%`
                        : selectedCapturedPoseScore
                          ? `${Math.round(selectedCapturedPoseScore.score * 100)}%`
                          : 'Need 8 good'}
                    </strong>
                  </div>
                  <span>
                    <span style={{
                      width: `${poseCaptureRun
                        ? poseCaptureProgress
                        : selectedCapturedPoseScore
                          ? Math.round(selectedCapturedPoseScore.score * 100)
                          : 0}%`
                    }} />
                  </span>
                </div>
                <div className="pose-capture-stats">
                  <span>Good: {poseCaptureCounts.good}</span>
                  <span>Bad: {poseCaptureCounts.bad}</span>
                  <span>Total: {poseDataset.samples.length}</span>
                </div>
                {capturedPoseScores.length > 0 && (
                  <div className="pose-capture-scores">
                    {capturedPoseScores.slice(0, 3).map((score) => (
                      <div key={score.category}>
                        <span>{categoryLabels[score.category]}</span>
                        <strong>{Math.round(score.score * 100)}%</strong>
                      </div>
                    ))}
                  </div>
                )}
                <p className="pose-capture-message">{poseCaptureMessage}</p>
                <div className="pose-capture-actions">
                  <button type="button" onClick={copyPoseDataset}>
                    <Download size={16} />
                    Copy JSON
                  </button>
                  <button type="button" onClick={downloadPoseDataset}>
                    <Download size={16} />
                    Download JSON
                  </button>
                  <label>
                    <Eye size={16} />
                    Import JSON
                    <input
                      type="file"
                      accept="application/json"
                      onChange={(event) => {
                        importPoseDataset(event.target.files?.[0] ?? null);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                  <button type="button" onClick={clearPoseCaptureTarget}>
                    <Trash2 size={16} />
                    Clear target
                  </button>
                </div>
              </div>

              <div className="metrics-grid">
                <Metric label="Hands" value={rawSignals.hands.handCount.toString()} />
                <Metric label="Thumbs" value={rawSignals.hands.thumbsUp ? 'yes' : 'no'} />
                <Metric label="Near face" value={rawSignals.hands.handNearFace ? 'yes' : 'no'} />
                <Metric label="Finger mouth" value={rawSignals.hands.fingerNearMouth ? 'yes' : 'no'} />
                <Metric label="Open palms" value={rawSignals.hands.raisedOpenPalms.toString()} />
                <Metric label="Thumb palms" value={rawSignals.hands.raisedHandsWithThumbs.toString()} />
                <Metric label="Prayer hands" value={rawSignals.hands.palmsTogetherNearFace ? 'yes' : 'no'} />
                <Metric label="Finger gun" value={rawSignals.hands.fingerGunAtCamera ? 'yes' : 'no'} />
                <Metric label="On head" value={rawSignals.hands.handsOnHead.toString()} />
                <Metric label="Head touch" value={rawSignals.hands.headTouches.toString()} />
                <Metric label="Side palms" value={rawSignals.hands.sideHeadPalmContacts.toString()} />
                <Metric label="Top palms" value={rawSignals.hands.topHeadPalmContacts.toString()} />
                <Metric label="Palm x" value={formatRatios(rawSignals.hands.palmCenterXRatio)} />
                <Metric label="Palm y" value={formatRatios(rawSignals.hands.palmCenterYRatio)} />
                <Metric label="Hand h" value={formatRatios(rawSignals.hands.handHeightRatio)} />
                <Metric label="Mouth" value={rawSignals.face.mouthOpen.toFixed(2)} />
                <Metric label="Eyes" value={rawSignals.face.eyeOpenness.toFixed(2)} />
                <Metric label="Brow" value={rawSignals.face.browFurrow.toFixed(2)} />
                <Metric label="Squint" value={rawSignals.face.squint.toFixed(2)} />
                <Metric label="Scale" value={rawSignals.face.faceScale.toFixed(2)} />
                <Metric label="Frown" value={rawSignals.face.mouthFrown.toFixed(2)} />
                <Metric label="Look up" value={rawSignals.face.lookUp.toFixed(2)} />
                <Metric label="Look down" value={rawSignals.face.lookDown.toFixed(2)} />
                <Metric label="Head up" value={rawSignals.face.headTiltUp.toFixed(2)} />
                <Metric label="Head down" value={rawSignals.face.headTiltDown.toFixed(2)} />
                <Metric label="Head side" value={rawSignals.face.headTiltSide.toFixed(2)} />
                <Metric label="Tongue" value={rawSignals.face.tongueOut.toFixed(2)} />
                <Metric label="Smile" value={rawSignals.face.smile.toFixed(2)} />
                <Metric label="Mouth d" value={normalizedSignals.face.mouthOpenDelta.toFixed(2)} />
                <Metric label="Eyes d" value={normalizedSignals.face.eyeOpennessDelta.toFixed(2)} />
                <Metric label="Brow d" value={normalizedSignals.face.browFurrowDelta.toFixed(2)} />
                <Metric label="Scale x" value={normalizedSignals.face.faceScaleRatio.toFixed(2)} />
                <Metric label="Frown d" value={normalizedSignals.face.mouthFrownDelta.toFixed(2)} />
                <Metric label="Look up d" value={normalizedSignals.face.lookUpDelta.toFixed(2)} />
                <Metric label="Look down d" value={normalizedSignals.face.lookDownDelta.toFixed(2)} />
                <Metric label="Head up d" value={normalizedSignals.face.headTiltUpDelta.toFixed(2)} />
                <Metric label="Head down d" value={normalizedSignals.face.headTiltDownDelta.toFixed(2)} />
                <Metric label="Head side d" value={normalizedSignals.face.headTiltSideDelta.toFixed(2)} />
                <Metric label="Tongue d" value={normalizedSignals.face.tongueOutDelta.toFixed(2)} />
                <Metric label="Smile d" value={normalizedSignals.face.smileDelta.toFixed(2)} />
              </div>

              <div className="candidate-list">
                {candidates.length > 0 ? candidates.map((candidate) => (
                  <div key={candidate.category}>
                    <span>{categoryLabels[candidate.category]}</span>
                    <strong>{Math.round(candidate.score * 100)}%</strong>
                  </div>
                )) : <span>No candidates</span>}
              </div>

              <div className="preview-row">
                {(Object.keys(categoryLabels) as MemeCategory[]).map((category) => (
                  <button key={category} onClick={() => previewCategory(category)}>
                    {categoryLabels[category]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getVisibleGuideChecks(checks: PoseGuideCheck[]): PoseGuideCheck[] {
  const unmetChecks = checks
    .filter((check) => !check.met)
    .sort((a, b) => a.progress - b.progress);
  const metChecks = checks.filter((check) => check.met);

  return [...unmetChecks, ...metChecks].slice(0, 2);
}

function formatRatios(values: number[]): string {
  return values.length > 0 ? values.map((value) => value.toFixed(2)).join(' / ') : '-';
}

function mergeReactionCandidates(
  ruleCandidates: ReactionCandidate[],
  capturedCandidates: ReactionCandidate[]
): ReactionCandidate[] {
  const byCategory = new Map<MemeCategory, ReactionCandidate>();

  for (const candidate of [...ruleCandidates, ...capturedCandidates]) {
    const current = byCategory.get(candidate.category);
    if (!current || candidate.score > current.score) {
      byCategory.set(candidate.category, candidate);
    }
  }

  return [...byCategory.values()].sort((a, b) => b.score - a.score);
}

function getPoseCaptureQuality(run: PoseCaptureRun): { accepted: boolean; message: string } {
  const handVisibleSamples = run.samples.filter((sample) => {
    const handCountIndex = sample.features.names.indexOf('handCount');
    return (sample.features.values[handCountIndex] ?? 0) > 0;
  }).length;
  const handVisiblePercent = Math.round((handVisibleSamples / run.samples.length) * 100);

  if (
    run.label === 'good' &&
    handRequiredCapturedCategories.has(run.category) &&
    handVisiblePercent < (minimumHandVisiblePercentByCategory[run.category] ?? 70)
  ) {
    return {
      accepted: false,
      message: `Rejected capture: hands were visible in only ${handVisiblePercent}% of frames. Keep at least part of the hand detectable during the countdown and capture.`
    };
  }

  if (handRequiredCapturedCategories.has(run.category)) {
    return {
      accepted: true,
      message: `Hand visible in ${handVisiblePercent}% of frames.`
    };
  }

  return {
    accepted: true,
    message: 'Capture quality checked.'
  };
}

function getCapturedPoseCandidateThreshold(category: MemeCategory): number {
  return capturedPoseCandidateThresholds[category] ?? defaultCapturedPoseCandidateThreshold;
}

function isCapturedPoseCandidateAllowed(category: MemeCategory, signals: NormalizedSignals): boolean {
  if (category !== 'lets-larp') {
    return true;
  }

  return signals.hands.handCount >= 1 &&
    !signals.hands.handNearFace &&
    !signals.hands.fingerNearMouth &&
    signals.hands.headTouches === 0 &&
    signals.hands.handsOnHead === 0;
}

function loadPoseCaptureDataset(): PoseCaptureDataset {
  if (typeof window === 'undefined') {
    return createEmptyPoseDataset();
  }

  const stored = window.localStorage.getItem(poseCaptureStorageKey);
  if (!stored) {
    return createEmptyPoseDataset();
  }

  return parsePoseCaptureDataset(stored) ?? createEmptyPoseDataset();
}

function savePoseCaptureDataset(dataset: PoseCaptureDataset) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(poseCaptureStorageKey, JSON.stringify(dataset));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
