# Reaction Clip Booth V2 Design

## Goal

Make Meme React V2 feel meaningfully different from V1 by turning the app from a live reaction detector into a shareable clip booth.

Users can enable reaction clips, perform a reaction, and get a short local WebM clip when the reaction locks. Recording must be explicit opt-in, local-only, audio-free by default, and visibly active while capturing. Microphone audio is allowed only behind a separate default-off toggle.

## Product Direction

- V2 headline feature: Reaction Clip Booth.
- Meme source direction: keep memes local for V2, but keep the system ready for richer provider/catalog metadata later.
- Backend direction: no backend in V2.
- Export direction: short WebM video first, not GIF.
- Clip length: 3 seconds by default.
- Privacy direction: no automatic recording unless the user enables reaction clips.

## Start Screen Requirements

The Start screen should include a short privacy note:

```text
Camera preview stays on this device. Clips are only recorded if you enable reaction clips.
```

It should include a visible toggle:

```text
Reaction clips: Off / On
```

The toggle defaults to `Off`.

If the user turns it on, show:

```text
When a reaction locks, the app saves a short local clip. Nothing is uploaded.
```

If reaction clips are enabled, show a separate microphone toggle:

```text
Microphone: Off / On
```

The microphone toggle defaults to `Off`. If the user turns it on, make it explicit that clips include mic audio.

## Recording Behavior

- Camera access still requires browser permission.
- Auto clip recording only happens after the user enables reaction clips.
- Recording starts when a reaction becomes active after the existing stability lock.
- Recording captures 3 seconds.
- Recording captures no audio by default.
- Recording includes microphone audio only when the separate microphone toggle is explicitly enabled.
- A visible recording indicator appears while capturing.
- After recording, the app shows a clip preview.
- The user can discard/delete the preview before saving.
- The user can download/export the clip manually.
- The latest clip stays in browser memory only.
- V2 has no backend, no upload, no account, and no persistent clip gallery.

## Implementation Shape

- Add clip state to the app:
  - disabled
  - armed
  - recording
  - preview-ready
  - discarded
- Trigger recording from the existing reaction activation event, not from raw unstable candidates.
- Capture the camera/meme/reaction composition with a browser-native recording flow, likely a canvas stream plus `MediaRecorder`.
- Add a preview panel for the latest clip with `Download` and `Discard` actions.
- Keep the Developer panel available for tuning.
- Keep the main flow friend/tester-friendly: start, calibrate, react, preview, export.

## Deferred Ideas

- Meme Pack Studio remains a strong later feature: users add/import/export local meme packs and assign memes to reactions.
- Internet sources like GIPHY or AI matching are deferred because they likely need backend/API-key/error-state decisions.
- Pose-match guide remains a future separate mode, not part of the first Clip Booth implementation.

## Acceptance Criteria

- Clips do not record when the toggle is off.
- Clips auto-record after reaction lock when the toggle is on.
- Recording indicator is visible during capture.
- Preview appears after capture.
- Discard removes the preview and releases the object URL.
- Download exports the latest WebM.
- Exported WebM has no audio when microphone is off.
- Exported WebM includes mic audio only when microphone is explicitly enabled.
- Camera and meme display still work without recording enabled.
- Tests and production build pass.
