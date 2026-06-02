# Meme React V2 Recovered Planning Context

This document reconstructs the important V2 planning discussion recovered from local Codex session logs after the laptop shut down mid-plan on 2026-06-01.

Primary recovered sessions:

- `019e82f4-7286-71c3-96b5-d70e5a75e8a0`
- `019e8308-7474-7282-89de-3f275b2a6865`

## Final Locked V2 Direction

V2 should be **Reaction Clip Booth**.

The reason this became the final V2 direction: the earlier V2 idea still felt too close to V1. Reaction Clip Booth makes the app feel like a new product moment: a friend performs a reaction, the app detects it, captures the moment, and gives them something shareable.

The locked product decision:

- V2 records short local clips after a reaction locks.
- Recording is opt-in.
- Clips are 3-second WebM videos.
- No audio is recorded in V2.
- Clips stay local unless the user manually downloads or shares them.
- No backend, account system, upload flow, or persistent clip gallery is part of V2.

## Decision Trail

### Internet meme sourcing

Options discussed:

- **Prepare only:** Build provider-ready meme architecture, but keep actual memes local until the app is stable.
- **GIPHY now:** Add GIPHY-backed search/source in V2, requiring an API key, network states, error handling, rate-limit handling, attribution/compliance, and fallback behavior.
- **AI matching now:** Add model-assisted meme selection, requiring provider choices, prompts, cost/privacy decisions, and testing around weird outputs.

Recovered recommendation:

- Choose **Prepare only** for V2.
- Keep local meme files for now.
- Avoid GIPHY/AI in this slice because the core app still needs stability and a clearer product experience.
- If GIPHY is added later, a frontend-only app cannot truly hide the key; a backend/proxy may eventually be needed.

### Backend timing

User asked whether backend work should start now.

Recovered decision:

- Do **not** start a full backend in V2.
- A backend makes sense later when there is a clear server-side job:
  - hiding GIPHY/AI API keys
  - storing uploaded meme packs
  - user accounts
  - shared links
  - analytics
  - moderation
- For now, keep adding memes locally under `public/memes/<category>`.
- Treat local files as the first meme provider, not the only possible provider forever.

### Friend/tester product shape

Options discussed:

- **Simple demo:** Start, calibrate, react, preview memes, optionally save a snapshot.
- **Creator studio:** Bigger meme browser, editable packs, reaction assignments, more controls.
- **Party mode:** Full-screen reactions, dramatic transitions, less visible debug/config UI.

Recovered recommendation:

- V2 should be friend/tester-friendly.
- The user should be able to open it, calibrate, react, see meme matches, and get a result with minimal explanation.
- Keep Developer panel available, but do not make debugging/configuration the main product surface.

### Earlier V2 plan: local-first provider and snapshot

Before the clip booth decision, the recovered plan was:

- Better recognition and calibration polish.
- Keep adding memes locally under `public/memes/<category>`.
- Add more memes per current category.
- Refactor meme library into a provider-style interface.
- Extend meme metadata for future title, source, tags, attribution, and weight.
- Improve startup, retry/reset, and developer tuning UI.
- Add PNG snapshot export of the current reaction moment.
- No backend, accounts, database, GIPHY, or AI integration in that V2 slice.

This plan was useful but later judged not "groundbreaking" enough for V2.

### Headline feature choice

Options discussed:

- **Meme Pack Studio:** Let users add/import/export local meme packs, assign memes to reactions, and make the app expandable without a backend.
- **Reaction Clip Booth:** Record short shareable clips/GIFs with the camera and meme overlay.
- **Internet Meme Brain:** Use GIPHY/AI matching now.

Recovered context:

- Meme Pack Studio means users can manage meme collections without a backend:
  - add meme images/GIFs from their computer
  - group them into packs
  - assign memes to reactions
  - import someone else's pack
  - export their own pack as a file
- By default, those memes are only for that user on that device/browser.
- For one user's memes to appear for everyone, V2 would need a backend/database, hosted catalog, or source-control contribution flow.
- The recommended simple version would be: users add memes for themselves and optionally export/share a pack file with friends.

Final turn:

- Reaction Clip Booth was chosen as the stronger V2 headline because it is more visibly new and shareable.
- Meme Pack Studio remains a good later feature.

### Pose-match guide idea

User asked how people would ensure the pose they make matches the meme photo.

Recovered future idea:

- A separate pose-match guide mode could show the target meme beside or over the camera preview.
- It could provide ghost/silhouette-style pose guidance or simple pose hints.
- It could compare face/body landmarks against the target pose with a tolerance range.
- It could show a match meter like closer/good/matched.
- It could optionally trigger the meme only when the user's pose is close enough to the photo.

Decision:

- Save this idea for later.
- Keep it separate from the first Reaction Clip Booth implementation because it requires pose/landmark comparison, tuning, and failure handling per meme photo.

## Final Reaction Clip Booth Plan

### Summary

V2 should turn Meme React from a live detector into a shareable clip booth. Users can enable reaction clips, perform a reaction, and get a short local WebM clip when the reaction locks.

Recording is explicit opt-in, local-only, no audio by default, and always visible while active.

### Start screen

Add this privacy note:

```text
Camera preview stays on this device. Clips are only recorded if you enable reaction clips.
```

Add a visible toggle:

```text
Reaction clips: Off / On
```

Default: `Off`.

If enabled, show:

```text
When a reaction locks, the app saves a short local clip. Nothing is uploaded.
```

### Recording behavior

- Camera access still requires browser permission.
- Auto clip recording only happens after the user enables reaction clips.
- Recording starts when a reaction becomes active after stability lock.
- Record 3-second WebM clips.
- Do not record audio by default.
- Show a visible recording indicator while capturing.
- Show a clip preview after recording.
- Let the user discard the clip before downloading/exporting.
- Keep the latest clip in browser memory only.
- Do not add backend, upload, account, or clip gallery in V2.

### Implementation changes

- Add clip state to the app:
  - disabled
  - armed
  - recording
  - preview-ready
  - discarded
- Trigger recording from the reaction activation event after the stability lock.
- Capture the camera/meme/reaction composition using a canvas stream or equivalent browser-native recording flow.
- Use `MediaRecorder` for video-only WebM.
- Add a preview panel for the latest clip.
- Add `Download` and `Discard` actions.
- Keep existing local meme system, but preserve provider-ready architecture for later.
- Keep Developer panel for tuning.
- Make the main experience friendly for testers rather than config-heavy.

### Test plan

- `npm.cmd test`
- `npm.cmd run build`
- Manual: clips do not record when toggle is off.
- Manual: clips auto-record after reaction lock when toggle is on.
- Manual: recording indicator appears during capture.
- Manual: preview appears after capture.
- Manual: discard removes the preview and revokes the object URL.
- Manual: downloaded WebM has no audio.
- Manual: camera and meme display still work without recording enabled.

## Open Recovery Notes

- The local session logs preserved the important user messages, selected options, assistant explanations, and final Plan Mode block.
- Some internal reasoning entries are encrypted in Codex logs and are not recoverable as readable text.
- The recovered content is enough to reconstruct the V2 direction and implementation plan without guessing.
