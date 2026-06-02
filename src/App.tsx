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
import type { MemeAsset, MemeCategory } from './memeTypes.ts';
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

const categoryLabels: Record<MemeCategory, string> = {
  'absolute-cinema': 'Absolute cinema',
  'we-are-cooked': 'We are cooked',
  'ah-hell-nah': 'Ah hell nah',
  thinking: 'Thinking',
  happy: 'Happy'
};

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
    headTiltUpDelta: 0,
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

  const [status, setStatus] = useState<AppStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [baseline, setBaseline] = useState<CalibrationBaseline | null>(null);
  const [rawSignals, setRawSignals] = useState<VisionSignals>(neutralSignals);
  const [normalizedSignals, setNormalizedSignals] = useState<NormalizedSignals>(neutralNormalizedSignals);
  const [candidates, setCandidates] = useState<ReactionCandidate[]>([]);
  const [activeReaction, setActiveReaction] = useState<ActiveReaction | null>(null);
  const [displayedMeme, setDisplayedMeme] = useState<MemeAsset | null>(null);
  const [developerOpen, setDeveloperOpen] = useState(false);
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
    activeReaction,
    displayedMeme,
    categoryLabels,
    videoRef
  });

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
          const nextCandidates = evaluateReactionRules(nextNormalizedSignals);
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

  async function previewCategory(category: MemeCategory) {
    setDisplayedMeme(await memeSourceRef.current.getRandom(category));
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

    setCalibrationProgress(0);
    setBaseline(null);
    setRawSignals(neutralSignals);
    setNormalizedSignals(neutralNormalizedSignals);
    setCandidates([]);
    setActiveReaction(null);
    setDisplayedMeme(null);
    resetClipSession();
  }

  return (
    <main className="app-shell">
      <section className="workspace" aria-label="Meme React workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Meme React</p>
            <h1>Reaction cam</h1>
          </div>
          <div className={`status-pill status-${status}`}>
            <span />
            {statusLabel}
          </div>
        </header>

        <section className="live-grid has-recording-dock">
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
              <span>{displayedMeme ? categoryLabels[displayedMeme.category] : 'Waiting'}</span>
            </div>
            <div className={`meme-frame ${displayedMeme ? 'is-active' : ''}`}>
              {displayedMeme ? (
                <img key={displayedMeme.id} src={displayedMeme.src} alt={`${categoryLabels[displayedMeme.category]} meme`} />
              ) : (
                <div className="meme-empty">No reaction</div>
              )}
            </div>
            <div className="reaction-meta">
              <strong>{activeReaction ? categoryLabels[activeReaction.category] : 'Neutral'}</strong>
              <span>{activeReaction ? activeReaction.reason : baseline ? 'Listening' : 'Not calibrated'}</span>
            </div>
          </aside>
          <p className="privacy-strip">
            Camera preview stays on this device. When reaction clips are enabled, a locked reaction saves one short local clip. Nothing is uploaded.
            {microphoneEnabled ? ' Microphone audio is included only while Microphone is On.' : ''}
          </p>
        </section>

        <section className="developer-panel">
          <button className="developer-toggle" onClick={() => setDeveloperOpen((open) => !open)}>
            <span>Developer</span>
            {developerOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {developerOpen && (
            <div className="developer-body">
              <div className="metrics-grid">
                <Metric label="Hands" value={rawSignals.hands.handCount.toString()} />
                <Metric label="Thumbs" value={rawSignals.hands.thumbsUp ? 'yes' : 'no'} />
                <Metric label="Near face" value={rawSignals.hands.handNearFace ? 'yes' : 'no'} />
                <Metric label="Finger mouth" value={rawSignals.hands.fingerNearMouth ? 'yes' : 'no'} />
                <Metric label="Open palms" value={rawSignals.hands.raisedOpenPalms.toString()} />
                <Metric label="Thumb palms" value={rawSignals.hands.raisedHandsWithThumbs.toString()} />
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
                <Metric label="Head up" value={rawSignals.face.headTiltUp.toFixed(2)} />
                <Metric label="Tongue" value={rawSignals.face.tongueOut.toFixed(2)} />
                <Metric label="Smile" value={rawSignals.face.smile.toFixed(2)} />
                <Metric label="Mouth d" value={normalizedSignals.face.mouthOpenDelta.toFixed(2)} />
                <Metric label="Eyes d" value={normalizedSignals.face.eyeOpennessDelta.toFixed(2)} />
                <Metric label="Brow d" value={normalizedSignals.face.browFurrowDelta.toFixed(2)} />
                <Metric label="Scale x" value={normalizedSignals.face.faceScaleRatio.toFixed(2)} />
                <Metric label="Frown d" value={normalizedSignals.face.mouthFrownDelta.toFixed(2)} />
                <Metric label="Look up d" value={normalizedSignals.face.lookUpDelta.toFixed(2)} />
                <Metric label="Head up d" value={normalizedSignals.face.headTiltUpDelta.toFixed(2)} />
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

function formatRatios(values: number[]): string {
  return values.length > 0 ? values.map((value) => value.toFixed(2)).join(' / ') : '-';
}
