# Meme React Project Notes

Last updated: 2026-06-03

## Project reset

- The old Diane-based app was replaced with a fresh Meme React app.
- Old legacy reaction names such as `cringe` and `shocked` were removed from the actual meme categories.
- The app now uses only these meme-native categories:
  - `absolute-cinema`
  - `we-are-cooked`
  - `ah-hell-nah`
  - `thinking`
  - `happy`

## Current meme files

- `public/memes/absolute-cinema/absolute cinema.jpg`
- `public/memes/we-are-cooked/we are cooked.jpg`
- `public/memes/ah-hell-nah/ah hell nah.jpg`
- `public/memes/thinking/thinks.jpg`
- `public/memes/happy/happy.jpg`

The generated catalog is rebuilt automatically by the dev, test, and build commands.

## Current visual version

- The UI is currently back on the v2 direction: **Cinematic Console**.
- v2 keeps the dark cinematic base from v1 but adds a richer outer frame, stronger ambient lighting, a more polished panel treatment, and subtle animated background motion.
- The user briefly asked to return to v1, then asked to go back to v2. Current code reflects v2.

## Current V2 product direction

- Recovered Plan Mode decision from 2026-06-01: **V2 = Reaction Clip Booth**.
- Goal: make Meme React meaningfully different from V1 by creating short shareable local clips after a reaction locks.
- Clip recording must be explicit opt-in.
- Start screen note: `Camera preview stays on this device. Clips are only recorded if you enable reaction clips.`
- Add a visible `Reaction clips: Off / On` toggle, defaulting to `Off`.
- Add a separate `Microphone: Off / On` toggle, defaulting to `Off`, shown only when reaction clips are enabled.
- If reaction clips are enabled, show: `When a reaction locks, the app saves a short local clip. Nothing is uploaded.`
- If microphone is enabled, make it explicit that clips include mic audio.
- Recording behavior:
  - camera permission remains browser-controlled
  - auto-record only after reaction clips are enabled
  - record 3-second WebM clips
  - include audio only if the separate microphone toggle is on
  - show a visible recording indicator such as `Recording video` or `Recording video + mic`
  - show a preview after recording
  - let users discard before saving/downloading
  - keep clips local unless explicitly exported/shared
  - no backend, upload, account, or clip gallery in V2
- Export composition:
  - use **Overlay Export**
  - mirrored camera feed as the base
  - active meme overlaid on the camera video
  - clean reaction label
  - no buttons, Developer panel, debug UI, or status UI in the exported clip
- Overlay meme sizing decision: implemented adaptive dramatic/sticker-style export. The current canvas export uses the mirrored camera as the base, a large framed meme overlay, and a clean reaction label.
- Current implementation status:
  - reaction clips are opt-in and default to off
  - microphone is a separate default-off toggle shown only when clips are enabled
  - a new reaction lock records one 3-second local WebM clip
  - clips use a hidden canvas export so buttons, Developer panel, debug UI, and status UI are excluded
  - preview, download, and discard controls are implemented
  - no backend, upload, account, or gallery was added
  - V2 Reaction Clip Booth is complete and live-verified as of 2026-06-03
- Durable docs:
  - `docs/superpowers/specs/2026-06-01-reaction-clip-booth-v2-design.md`
  - `docs/superpowers/plans/2026-06-01-reaction-clip-booth-v2.md`
  - `docs/superpowers/specs/2026-06-01-v2-recovered-planning-context.md`
  - `docs/superpowers/specs/2026-06-01-v2-active-planning-handoff.md`

## Current pose rules

### `absolute-cinema`

- Expected user pose: both hands raised with open palms visible.
- Current code requirement: at least two raised open palms and no detected true head contact.
- The previous coarse `handsOnHead` split was replaced with stricter contact-based separation because the app had been confusing it with `we-are-cooked`.

### `we-are-cooked`

- Expected user pose: both hands on head, mouth open, eyes somewhat wider than neutral.
- Current code requirement: true palm contact from both hands on the head.
- Open-mouth and eye-widening cues increase confidence, but they are no longer required for the pose to become a candidate.
- User preference: it should not require an extreme expression; a normal open mouth with slightly wide eyes should be enough.

### `ah-hell-nah`

- Expected user pose: looking upward in shock.
- Current code requirement: upward head tilt plus some mouth opening.
- User reported this one is working well.

### `thinking`

- Expected user pose: index finger near the mouth/chin, matching the meme pose.
- Current code requirement: an index fingertip in the mouth/chin zone, with a non-open-palm hand shape.
- A broad hand near the face or mouth no longer scores this reaction.

### `happy`

- Expected user pose: tongue out, with a smile helping confidence.
- Current code requirement: normalized tongue cue above threshold.
- Smile by itself does not score the reaction.
- Hands do not block this reaction.
- If MediaPipe exposes direct `tongueOut`, the app uses it. Otherwise, it derives a conservative tongue cue from an open smiling mouth.

## Issues already fixed

1. Camera startup overlay could look stuck after pressing Start.
   - Added explicit `Requesting camera` and `Loading vision` states.
   - Added a model-load timeout with a useful error message.

2. Old Diane-era category names caused confusion and mismatched photos.
   - Removed legacy category naming and aligned the app with meme-native IDs.

3. Reactions flickered on and off while a pose was still being held.
   - The active reaction now renews while the same pose remains present.

4. The retired deadpan fifth reaction used to win when hands appeared in frame.
   - The fifth reaction has been replaced with `happy`.
   - The old hand-visible invalidation path was removed because `happy` should work while hands are visible.

5. `absolute-cinema` and `we-are-cooked` overlapped too much.
   - The original broad `handsOnHead` split was replaced with a more specific `sideHeadPalmContacts` signal.
   - `absolute-cinema` now requires raised open palms with no true head contact.
   - `we-are-cooked` moved toward contact-based gating instead of relying only on expression cues.

6. `we-are-cooked` still failed live even when `On head = 2`.
   - Added a stricter `headTouches` signal for actual clustered palm contact on the head.
   - `we-are-cooked` now starts scoring from `Head touch = 2`, with `Mouth d` and `Eyes d` acting as confidence boosts.

7. The first true-contact pass still missed the user's live `we-are-cooked` pose.
   - The intended pose uses palms on top of the head, not only beside the temples.
   - Added `topHeadPalmContacts` and changed top-head detection to require both top-of-head placement and a compact hand shape, so upright `absolute-cinema` palms do not count as head contact.

8. Direct pose-to-pose switching felt delayed after detection started working.
   - The controller now keeps neutral-gap hold behavior, but a different leading pose can replace the active reaction once it has remained stable for the normal stability window.
   - Clean pose-to-pose handoffs no longer wait for the old hold window to expire or enter cooldown first.

9. The fifth reaction was replaced with `happy`.
   - The active category, generated catalog, UI label, reaction rule, tests, and developer metrics now use `happy`.
   - Raw signals now include `Tongue` and `Smile`.
   - Normalized signals now include `Tongue d` and `Smile d`.

10. V2 Reaction Clip Booth first implementation landed.
   - Added `Reaction clips: Off / On`, defaulting to off.
   - Added `Microphone: Off / On`, defaulting to off and shown only when clips are enabled.
   - Added local-only 3-second WebM recording after a reaction lock.
   - Added visible recording state, clip preview, download, and discard.
   - Export composition is a clean canvas render, not the full app UI.

11. First live clip test follow-up.
   - User confirmed clip recording and microphone audio work.
   - User reported clips looked closer to 2 seconds than 3 seconds.
   - Moved the 3-second stop timer to `MediaRecorder.onstart` so timing starts when recording actually begins.
   - Upgraded the export overlay from a simple white label/card to a more cinematic composition: graded camera base, stronger vignette, right-side poster meme card, accent strip, and cleaner lower-third reaction title.

12. Second overlay design follow-up.
   - User confirmed the clip timing fix works.
   - User said the meme overlay still looked bad and the text was too large.
   - Reduced the export meme overlay from a tall poster card to a smaller bottom-right insert.
   - Reduced reaction title sizing and brand-chip sizing.
   - Removed the bright vertical accent strip and softened borders/shadows so the meme feels less pasted on.
   - User confirmed the second overlay pass is much better and acceptable for now.

13. Clip UX polish pass.
   - Added a subtle `Clips armed` badge over the live camera when reaction clips are enabled and not recording.
   - Changed the ready state copy to `Latest clip ready`.
   - Added latest-clip metadata above the preview: reaction label, timestamp, 3-second duration, video/audio mode, and approximate file size.
   - Improved download filenames to include reaction category, ISO-like timestamp, and `-mic` when audio is included.

14. Preview overwrite protection.
   - A ready clip preview now blocks automatic recording of new reaction locks.
   - Added an explicit `Record next` action beside `Download` and `Discard`.
   - `Record next` clears the current preview and arms the next clip.
   - Clearing a preview records the currently held pose as already handled, so the app waits for a future reaction lock instead of immediately re-recording the same held pose.

15. Clip preview layout stability fix.
   - User reported the UI got larger after recording, which was distracting.
   - First attempted fix was bad: fixed-height hidden-overflow meme panel clipped `Discard`, made the meme photo disappear/shrink, and made the preview video too small.
   - Floating tray replacement was also rejected; it did not fit the desired product layout.
   - Current accepted direction to test: recording is now a left-side tab/drawer attached to the camera panel.
   - Follow-up correction: the tab/drawer must be a left grid column beside the camera and meme panels, not overlaid on top of the camera video.
   - Follow-up correction: the left recording panel should mirror the right meme panel and the workspace should widen for the three-panel layout so it does not feel like it steals space from the camera.
   - UI reset after user feedback:
     - removed the useless `Camera` / `Recording` switcher
     - made recording a permanent left utility panel instead of a dynamic drawer
     - moved the privacy/local-only sentence under the main panels instead of inside the cramped recording panel
     - removed duplicate ready copy (`Latest clip ready` is enough; do not also show `Clip ready.`)
     - made clip actions a deliberate vertical command stack
     - reserved preview space with an empty state so the panel does not resize when a clip appears
     - changed meme display to `object-fit: contain` to avoid over-cropping the meme photos
   - Detail follow-up:
     - privacy/local-only sentence now sits inside the main grid under the camera column, not centered under the full three-panel workspace
     - camera label now has a small backed pill/cutout and is inset from the reticle so the line does not run through the `Camera` label

16. Clip recorder cleanup/refactor.
   - User confirmed the current V2 clip flow works.
   - Extracted clip state, MediaRecorder lifecycle, mic handling, canvas export drawing, object URL cleanup, filename generation, and no-overwrite behavior from `src/App.tsx` into `src/useReactionClipRecorder.ts`.
   - `App.tsx` now owns app layout, camera/vision loop, pose state, and rendering; the hook owns recording.
   - Added `src/useReactionClipRecorder.node-test.ts` for filename and byte-format helpers.
   - Current automated verification: `npm.cmd test` now has 48 passing tests, and `npm.cmd run build` passes.
   - Meme panel is clean again: it only contains the meme photo and reaction meta.
   - Recording tab contains clip toggles, status, preview, `Download`, `Record next`, and `Discard`.
   - Clip action buttons should not wrap awkwardly across two lines; on desktop they are a clean three-button row, and on narrow screens they stack deliberately.
   - Do not reintroduce `overflow: hidden` plus fixed height on `.meme-panel` as a layout-shift fix.

## Current live-testing notes

- `absolute-cinema` vs `we-are-cooked`: true head-contact separation has been implemented and needs live validation.
- `absolute-cinema`: expected to trigger from two raised open palms that are not touching the sides or top of the head.
- `we-are-cooked`: expected to begin scoring when both palms are truly touching the top or sides of the head; a normal open mouth and slightly wider eyes should improve confidence.
- Direct handoffs between valid poses should feel responsive once the new pose stays stable for roughly a quarter second.
- `ah-hell-nah`: user reported it is working.
- `thinking`: should now require the visible finger cue instead of any hand near the face.
- `happy`: expected to trigger from tongue out; smile should increase confidence but should not trigger by itself.
- Reaction clips passed live browser validation on 2026-06-03:
  - clips should not record while `Reaction clips` is off
  - clips should record once after a new reaction locks while `Reaction clips` is on
  - the red recording indicator should appear for roughly 3 seconds
  - preview should appear after recording
  - discard should remove the preview
  - downloaded WebM should be video-only when microphone is off
  - downloaded WebM should include mic audio only when the microphone toggle was explicitly enabled
  - after the timing fix, downloaded/previewed clips should last about 3 seconds
  - second overlay pass is accepted for now; revisit only after higher-priority V2 flow work
  - clip preview should show useful metadata and downloaded filenames should be readable
  - a ready preview should not be overwritten until the user clicks `Record next` or `Discard`
  - after recording, the desktop app shell should not jump taller or feel like it zoomed/enlarged
  - the meme photo should remain visible after recording
  - `Discard` must remain visible in the clip preview
  - the preview video should not be tiny
  - recording controls should live in a left grid-column `Recording` tab, not in the meme panel, floating tray, or on top of the camera
  - on desktop, the workspace should support a three-panel layout without noticeably shrinking the camera
  - `Download`, `Record next`, and `Discard` should be visually aligned as one row or intentionally stacked, not wrapped into an uneven two-line layout
  - do not duplicate `Latest clip ready` with another success sentence
  - do not put the local-only explanatory sentence inside the recording panel if it crowds the controls
  - meme photos should not be aggressively cropped; current UI uses `object-fit: contain`
  - privacy sentence should align with the camera column
  - camera reticle should not visually collide with the `Camera` label
  - after the cleanup refactor, manually spot-check that clips still record, preview, download, discard, and respect mic toggle behavior

## Future idea: pose-match guide

- User wants to revisit a mode where the app helps someone match the pose in a specific meme photo.
- Keep this separate from the main V2 reaction matching flow for now.
- Possible future behavior:
  - show the target meme beside or over the camera preview
  - provide a ghost/silhouette-style pose guide or simple pose hints
  - compare face/body landmarks against the target pose with a tolerance range
  - show a match meter such as closer/good/matched
  - optionally trigger the meme only when the user is close enough to the photo pose
- This would be more complex than assigning memes to reaction categories because it needs pose/landmark comparison, tuning, and failure handling for different photos.

## Next useful test for `thinking`

Open the Developer panel and compare these two poses:

1. `thinking`
   - place only your index finger near your mouth or chin
   - expected debug values: `Near face = yes`, `Finger mouth = yes`
2. Broad hand near face
   - bring your whole hand near your mouth without a clear pointing finger
   - expected debug values: `Near face = yes`, `Finger mouth = no`

If it still misfires, record:

- `Near face`
- `Finger mouth`
- `Hands`
- candidate list

## Next useful test for `happy`

Try this exact pose:

1. Start from a neutral calibrated face.
2. Stick your tongue out toward the camera.
3. Optionally smile while holding the tongue-out pose.
4. Keep holding for about one second.

If `happy` does not appear, open the Developer panel and record:

- `Tongue`
- `Smile`
- `Tongue d`
- `Smile d`
- `Hands`
- candidate list

Those values should be used for the next tuning pass instead of guessing.

## Next useful live test for `absolute-cinema` vs `we-are-cooked`

Open the Developer panel and compare these two poses:

1. `absolute-cinema`
   - raise both open palms clearly away from the sides and top of the head
   - expected debug values: `Open palms = 2`, `Head touch = 0`
2. `we-are-cooked`
   - rest both palms on top of the head
   - expected debug values: `Top palms = 2`, `Head touch = 2`

If either pose still misfires, record:

- `Open palms`
- `On head`
- `Head touch`
- `Side palms`
- `Top palms`
- `Mouth d`
- `Eyes d`
- candidate list

## Next-session handoff

- Restart handoff: the user is happy with the current direction and confirmed the stricter `thinking` trigger is working live.
- Recovered V2 direction is now saved to disk: Reaction Clip Booth with opt-in, local-only, 3-second WebM recording after reaction lock.
- Latest V2 planning update: include audio only when a separate microphone toggle is explicitly enabled; microphone defaults to off.
- Latest V2 export decision: use Overlay Export, not side-by-side export.
- Overlay sizing question is no longer blocking; current implementation uses adaptive dramatic/sticker-style overlay export.
- V2 Reaction Clip Booth is complete and live-verified; do not spend more time on clip validation unless a new bug appears.
- Next meaningful product step: start planning the separate pose-match guide mode, or handle mobile layout later when the user asks for it.
- All current meme photos are working well.
- The fifth category is `happy`; the old deadpan fifth reaction has been retired.
- `thinking` now depends on `Finger mouth = yes`, not merely `Near face = yes`.
- First thing in a new chat: inspect `git status --short`, read this file, then continue from the current working tree without reverting user or agent changes.
- If live tuning resumes, start or reuse the dev server at `http://127.0.0.1:5173/` and open the Developer panel.
- Validate `thinking` from recorded `Near face`, `Finger mouth`, and candidate-list values if it needs more tuning.
- Validate `happy` from recorded `Tongue`, `Smile`, `Tongue d`, `Smile d`, and candidate-list values if it needs more tuning.

## Current commands

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd test
npm.cmd run build
```

Local dev URL:

```text
http://127.0.0.1:5173/
```

## Current verification

Latest verified state on 2026-06-01:

- `node --test --experimental-strip-types "src/visionSignals.node-test.ts"`: 10 tests passed
- `node --test --experimental-strip-types "src/reactionRules.node-test.ts"`: 15 tests passed
- `npm.cmd test`: 45 tests passed
- `npm.cmd run build`: passed

Latest verified state on 2026-06-02:

- `npm.cmd test`: 45 tests passed
- `npm.cmd run build`: passed
- Manual browser validation of clip recording is still pending.

Latest follow-up verification on 2026-06-02:

- `npm.cmd test`: 45 tests passed
- `npm.cmd run build`: passed
- Manual browser re-test of clip duration and overlay redesign is pending.

Latest overlay follow-up verification on 2026-06-02:

- `npm.cmd test`: 45 tests passed
- `npm.cmd run build`: passed
- Manual browser re-test of the smaller meme insert and reduced text is pending.

Latest clip UX polish verification on 2026-06-02:

- `npm.cmd test`: 45 tests passed
- `npm.cmd run build`: passed
- Manual browser re-test of armed badge, preview metadata, and filename is pending.

Latest preview-protection verification on 2026-06-02:

- `npm.cmd test`: 45 tests passed
- `npm.cmd run build`: passed
- Manual browser re-test of `Record next` and no-overwrite behavior is pending.

Latest layout-stability verification on 2026-06-02:

- `npm.cmd test`: 45 tests passed
- `npm.cmd run build`: passed
- Replaced the rejected floating tray with a camera-side left `Recording` tab/drawer.
- Moved the `Recording` tab/drawer out of the camera overlay and into the left side of the main live grid.
- Widened the desktop workspace and made the live grid `Recording | Camera | Meme`, with recording/meme as side panels.
- Replaced the three-column desktop action row with a deliberate vertical command stack after spacing feedback.
- Latest reset makes recording a permanent left panel, removes the tab switcher, reserves preview space, moves privacy copy below the panels, and stacks clip actions vertically.
- Latest detail pass aligns the privacy note to the camera column and backs the `Camera` label so it no longer sits awkwardly on the reticle line.
- Manual browser re-test of no-growth, clean meme panel, visible `Discard`, usable preview size, and no camera overlap is pending.

Latest cleanup verification on 2026-06-02:

- `npm.cmd test`: 48 tests passed
- `npm.cmd run build`: passed
- Manual browser spot-check after moving recording logic into `useReactionClipRecorder` is pending.

Latest continuation verification on 2026-06-03:

- `git status --short`: clean
- `npm.cmd test`: 48 tests passed
- `npm.cmd run build`: passed
- Dev server started at `http://127.0.0.1:5173/`
- User confirmed the live browser flow works after moving recording logic into `useReactionClipRecorder`.
