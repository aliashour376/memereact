# Reaction Clip Booth V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in local reaction clip recording to Meme React V2. When enabled, the app records a short WebM clip after a reaction locks, shows a preview, and lets the user discard or download it.

**Architecture:** Keep the current React/Vite app and local meme system. Add a small clip-recording state machine in the UI layer, capture the composed camera/reaction output with browser-native recording APIs, and keep all generated media local to the browser session.

**Tech Stack:** React 19, TypeScript, MediaPipe Tasks Vision, Vite, Node test runner, browser `MediaRecorder`.

---

## File Map

- `src/App.tsx`: clip toggle, recording state, reaction-lock trigger, preview UI, download/discard actions.
- `src/reactionState.ts`: inspect whether active reaction transitions expose a clean lock/start event; adjust only if needed.
- `src/reactionState.node-test.ts`: add state-transition coverage only if reaction controller behavior changes.
- `README.md`: document V2 clip behavior after implementation.
- `PROJECT_NOTES.md`: update handoff and live-testing notes.

## Task 1: Identify The Reaction-Lock Trigger

- [x] Read `src/App.tsx` and `src/reactionState.ts`.
- [x] Identify the exact point where a reaction first becomes active after the stability window.
- [x] Prefer triggering clip recording from that transition instead of from every frame with an active reaction.
- [x] If the controller already exposes enough information, do not change `reactionState.ts`.

## Task 2: Add Clip State And Toggle

- [x] Add local UI state for whether reaction clips are enabled.
- [x] Default reaction clips to `Off`.
- [x] Add a Start screen privacy note:

```text
Camera preview stays on this device. Clips are only recorded if you enable reaction clips.
```

- [x] Add a visible `Reaction clips: Off / On` control.
- [x] When enabled, show:

```text
When a reaction locks, the app saves a short local clip. Nothing is uploaded.
```

- [x] Add clip lifecycle state:
  - disabled
  - armed
  - recording
  - preview-ready
  - discarded

## Task 3: Build Browser-Native Recording

- [x] Capture the displayed camera/meme/reaction composition.
- [x] Prefer a canvas stream if direct DOM/video composition is not recordable.
- [x] Use `MediaRecorder`.
- [x] Follow newer `PROJECT_NOTES.md`: include audio only when the separate microphone toggle is explicitly enabled.
- [x] Record 3 seconds by default.
- [x] Store only the latest clip Blob/Object URL in browser memory.
- [x] Revoke old object URLs when replacing or discarding clips.

## Task 4: Trigger Recording From Reaction Lock

- [x] When reaction clips are off, never start recording.
- [x] When clips are enabled and a new reaction locks, start recording once.
- [x] Avoid repeatedly recording while the same reaction is held.
- [x] Avoid starting a second recording while one is already active.
- [x] Decide whether a new reaction can record after the previous recording finishes; prefer yes for a different lock.

## Task 5: Add Recording And Preview UI

- [x] Show a visible recording indicator while capturing.
- [x] After capture, show a preview for the latest WebM.
- [x] Add `Download` and `Discard` actions.
- [x] `Download` should save/export the local WebM.
- [x] `Discard` should remove the preview and revoke the object URL.
- [x] Keep the Developer panel available but keep the main flow focused on friend/tester use.

## Task 6: Verification

- [x] Run:

```powershell
npm.cmd test
```

- [x] Run:

```powershell
npm.cmd run build
```

- [ ] Manually verify clips do not record when toggle is off.
- [ ] Manually verify clips auto-record after reaction lock when toggle is on.
- [ ] Manually verify the recording indicator appears during capture.
- [ ] Manually verify preview appears after capture.
- [ ] Manually verify discard removes preview.
- [ ] Manually verify downloaded WebM has no audio when microphone is off, and includes mic audio only when explicitly enabled.
- [ ] Manually verify camera and meme display still work without recording enabled.

## Self-Review

- Privacy is explicit: opt-in, local-only, no audio, visible recording state.
- Scope is V2-sized: no backend, no accounts, no upload, no gallery.
- The feature is meaningful enough for V2 while preserving the existing local meme/detection foundation.
