# Meme React Project Notes

Last updated: 2026-06-04

## Project reset

- The old Diane-based app was replaced with a fresh Meme React app.
- Old legacy reaction names such as `cringe` and `shocked` were removed from the actual meme categories.
- The app now uses these meme-native categories:
  - `absolute-cinema`
  - `we-are-cooked`
  - `ah-hell-nah`
  - `thinking`
  - `happy`
  - `lets-larp`
  - `no-idea-cuh`
  - `son`
  - `tf`
  - `zoltraak`

## Current meme files

- `public/memes/absolute-cinema/absolute cinema.jpg`
- `public/memes/we-are-cooked/we are cooked.jpg`
- `public/memes/ah-hell-nah/ah hell nah.jpg`
- `public/memes/thinking/thinks.jpg`
- `public/memes/happy/happy.jpg`
- `public/memes/lets-larp/lets-larp.png`
- `public/memes/no-idea-cuh/no-idea-cuh.png`
- `public/memes/son/son.png`
- `public/memes/tf/tf.jpg`
- `public/memes/zoltraak/zoltraak.png`

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

### `lets-larp`

- User-defined pose: one hand extended toward the camera, palm facing inward, index finger pointing directly at the viewer, thumb facing upward, with the head tilted just a bit.
- Current recognition path: captured-pose model only.
- The previous hand-written `Finger gun` / reach / head-tilt fallback was removed so this meme can be trained from good/bad examples instead of guessed thresholds.

### `no-idea-cuh`

- Expected user pose: shrug with both open palms held lower beside the shoulders.
- Current recognition path: captured-pose model only.
- The previous first-pass low-open-palms rule was removed.

### `son`

- Expected user pose: prayer hands held near the face.
- Current recognition path: captured-pose model only.
- The previous first-pass prayer-hands rule was removed.
- Developer panel still exposes `Prayer hands` as a raw feature for capture/model debugging.

### `tf`

- Expected user pose: looking downward at a phone.
- Current recognition path: captured-pose model only.
- The previous first-pass downward-gaze rule was removed.
- Developer panel still exposes `Look down`, `Head down`, `Look down d`, and `Head down d` as raw features for capture/model debugging.

### `zoltraak`

- Expected user pose: chin lifted/head tilted up with a relaxed mouth.
- Current recognition path: captured-pose model only.
- The previous first-pass chin-up rule was removed.
- `ah-hell-nah` still requires some mouth opening.

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

17. Pose-match guide first pass.
   - Added a separate `React` / `Guide` mode toggle in the top bar.
   - `React` mode keeps the V2 recording dock and local clip behavior.
   - `Guide` mode swaps the left dock for target selection, a match meter, and per-cue progress checks.
   - Guide mode uses the same live normalized pose signals as the reaction rules, but does not auto-record clips even if reaction clips were armed in React mode.
   - The right meme panel shows the selected target meme in Guide mode.
   - Added `src/poseGuide.ts` and `src/poseGuide.node-test.ts`.
   - Current automated verification: `npm.cmd test` has 55 passing tests, and `npm.cmd run build` passes.
   - Dev server checked at `http://127.0.0.1:5173/` with HTTP 200.

18. Pose guide coaching polish.
   - User chose the low-impact **Better Coaching** direction for Guide mode.
   - Guide mode now shows one compact `Next move` hint between the match meter and cue checklist.
   - Hints are generated in `src/poseGuide.ts` from the weakest unmet cue, so the UI can say things like `Show both open palms`, `Move hands away from your head`, `Point a finger near your mouth`, or `Stick your tongue out`.
   - Matched poses show `Matched - hold it`.
   - The change is Guide-mode only; React mode, clip recording, mic behavior, local-only export, and the three-panel layout remain unchanged.
   - Local-first image policy was chosen for future photo additions. Internet images should not be hotlinked into clip export without a separate import/localization plan because of canvas CORS, reliability, privacy, and licensing issues.
   - Current automated verification: `npm.cmd test` has 56 passing tests, and `npm.cmd run build` passes.

19. `we-are-cooked` guide simplification.
   - User said the wide-eyes cue is not helpful for the `we-are-cooked` meme guide.
   - Removed `Widen eyes` from Guide mode checks and hints for `we-are-cooked`.
   - Guide mode now treats `we-are-cooked` as `Put both palms on head` plus `Mouth open`.
   - The actual reaction detection rule still keeps eye widening only as a confidence boost unless separately changed.

20. React-mode `we-are-cooked` reason copy alignment.
   - The visible reaction reason no longer says `open mouth and wide eyes`.
   - React mode now describes the trigger as `palms on head`, matching the current rule where head contact gates the reaction and expression cues only boost confidence.

21. New meme category first pass.
   - Added `lets-larp`, `no-idea-cuh`, `son`, `tf`, and `zoltraak` as first-class meme categories.
   - The catalog generator now includes those folders and the generated catalog points at the new local image files.
   - Added first-pass React and Guide rules for all five new categories.
   - Added downward gaze/head-tilt signals for `tf` and a `Prayer hands` signal for `son`.
   - Tightened `absolute-cinema` so lower two-palm poses can route to `no-idea-cuh`.
   - Important correction from user: do not independently decide final trigger mappings for new memes. Work through each new meme with user guidance and tune from live Developer panel values.

22. Guide target list scalability fix.
   - The Guide-mode meme target buttons now live in a capped scroll area.
   - Adding more memes should no longer make the whole left Guide panel taller.

23. React/Guide mode sizing stabilization.
   - React and Guide now share the same outer panel height for the left dock, camera panel, and meme panel.
   - Mode-specific overflow stays inside the Recording/Guide dock instead of changing the whole workspace size.
   - Mobile uses the same approach with a smaller shared panel height.

24. Guide cue-list space reduction.
   - Guide mode now displays only two cue rows at a time, prioritizing unmet cues first.
   - The match meter still uses all underlying checks; this is only a display/layout rule.
   - The saved space was given back to the scrollable meme target list.

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

- First pass is now implemented as a separate `Guide` mode.
- Keep future additions separate from the main V2 reaction matching and recording flow.
- Possible future behavior:
  - refine the target meme beside or over the camera preview
  - provide a ghost/silhouette-style pose guide or simple pose hints
  - compare face/body landmarks against the target pose with a tolerance range
  - tune the match meter labels and thresholds after live camera testing
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
- If guide mode tuning resumes, use the new `React` / `Guide` toggle and compare the guide cue percentages with the Developer panel signals.
- Guide mode now has a `Next move` hint; tune hint priority from `src/poseGuide.ts` if live testing shows a less useful cue is being surfaced first.
- For `we-are-cooked` Guide mode, do not re-add wide eyes unless the user specifically asks; it was removed as unhelpful.
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

Latest guide-mode continuation on 2026-06-04:

- `npm.cmd test`: 55 tests passed
- `npm.cmd run build`: passed
- Dev server started and checked at `http://127.0.0.1:5173/`
- Manual camera live-testing of Guide mode thresholds is pending.

Latest guide-coaching continuation on 2026-06-04:

- `npm.cmd test`: 56 tests passed
- `npm.cmd run build`: passed
- Guide mode now surfaces a compact `Next move` coaching hint.
- Manual camera live-testing of hint priority and wording is pending.

Latest `we-are-cooked` guide tuning on 2026-06-04:

- Removed wide-eyes from `we-are-cooked` Guide mode checks and hints.
- `npm.cmd test`: 56 tests passed
- `npm.cmd run build`: passed

Latest React-mode reason-copy continuation on 2026-06-04:

- Changed the `we-are-cooked` reaction reason from stale wide-eyes/open-mouth copy to `palms on head`.
- Added a reaction-rule test assertion for the new reason copy.
- `npm.cmd test`: 56 tests passed
- `npm.cmd run build`: passed

Latest new-meme continuation on 2026-06-04:

- Added local categories/assets for `lets-larp`, `no-idea-cuh`, `son`, `tf`, and `zoltraak`.
- Added first-pass pose rules and Guide-mode coaching for all five.
- Added raw/normalized `Look down` and `Head down` signals plus `Prayer hands`.
- `npm.cmd test`: 70 tests passed
- `npm.cmd run build`: passed

Latest Guide target-list continuation on 2026-06-04:

- Made the Guide-mode meme target list scroll inside a fixed-height region.
- User explicitly wants all new meme trigger behavior to be guided by them; do not continue inventing pose mappings alone.
- `npm.cmd test`: 70 tests passed
- `npm.cmd run build`: passed

Latest React/Guide sizing continuation on 2026-06-04:

- Stabilized React/Guide switching by giving the left dock, camera, and meme panels a shared fixed panel height.
- Recording and Guide content now scroll internally when needed instead of resizing the workspace.
- `npm.cmd test`: 70 tests passed
- `npm.cmd run build`: passed

Latest Guide two-tip continuation on 2026-06-04:

- Guide mode now shows only two cue/tip rows, with unmet cues shown first.
- Increased the meme target scroll area from 200px to 248px.
- `npm.cmd test`: 70 tests passed
- `npm.cmd run build`: passed

Latest `lets-larp` guided trigger continuation on 2026-06-04:

- Replaced the rough open-palm `lets-larp` trigger with the user-defined pose: index finger pointed at the camera, thumb upward, plus a slight head side tilt.
- Added a dedicated `Finger gun` hand signal and `Head side` / `Head side d` face metrics to the Developer panel.
- Guide mode now asks for `Point finger at camera` and `Tilt head slightly`.
- Open hand alone and pointed hand without head tilt are covered as non-triggers.
- `npm.cmd test`: 75 tests passed
- `npm.cmd run build`: passed

Latest `lets-larp` live tuning continuation on 2026-06-04:

- User live values for intended pose: `Hands = 1`, `Thumbs = no`, `Finger gun = no`, `Palm x = -0.42`, `Palm y = 1.61`, `Hand h = 1.16`, `Head side = 0.28`, `Scale x = 0.77`.
- MediaPipe did not reliably resolve thumb/index shape when the hand was close to the camera.
- Added a fallback `lets-larp` hand path: one close non-open hand (`Hand h >= 0.85`, `Palm y >= 0.95`, no head touch, not an open palm) plus the existing slight head side tilt requirement.
- Guide cue changed to `Reach pointed hand at camera`.
- `npm.cmd test`: 77 tests passed
- `npm.cmd run build`: passed

Latest `lets-larp` distance tuning continuation on 2026-06-04:

- User reported the pose still missed and noted the rule must account for how far the user's hand/body is from the camera.
- Replaced the fallback's hard `Hand h >= 0.85` style threshold with an adaptive reach score.
- The adaptive score combines hand size relative to `Scale x`, forward/down palm placement, and edge reach from `Palm x`; head tilt is now a boost/prompt instead of a hard blocker because calibration can zero out `Head side d`.
- Added coverage for a farther-user case: smaller `Hand h`, lower `Scale x`, still one non-open hand reaching toward camera.
- If it still misses, record `Hands`, `Open palms`, `Palm x`, `Palm y`, `Hand h`, `Head side d`, `Scale x`, and candidate list.
- `npm.cmd test`: 79 tests passed
- `npm.cmd run build`: passed

Latest `lets-larp` open-palm live tuning continuation on 2026-06-04:

- User live values showed the direct finger-gun-at-camera pose can still report `Open palms = 1`, `Thumbs = 0`, and `Finger gun = no`.
- `lets-larp` no longer treats one open palm as a hard blocker when the one-hand reach geometry is strong.
- Open palm is now a confidence penalty for this fallback path, so generic nearby open hands should stay below the reaction threshold while the live direct-at-camera values can pass.

Latest captured-pose model continuation on 2026-06-04:

- User decided to stop relying on manual threshold tuning for harder meme poses and move toward a bigger capture-based technique.
- Added `src/poseCapture.ts`, which converts normalized live pose signals into fixed-length feature vectors and scores live poses against saved good/bad examples.
- Added a Developer-panel `Captured pose model` tool:
  - choose a meme target
  - record 2.6-second `good` or `bad` pose examples from the live camera
  - see saved sample counts and current model score
  - copy, download, import, or clear pose dataset JSON
- Captured examples are saved locally in browser `localStorage` under `memereact.poseCaptureDataset.v1`.
- Exported pose dataset JSON files should be saved under `pose-datasets/`; that folder now has a README with naming and capture guidance.
- React-mode candidate scoring now merges normal rule candidates with high-confidence captured-pose model candidates once a target has at least 8 good examples.
- This is the new preferred workflow for complex new memes: capture acceptable and unacceptable examples first, then refine from actual data instead of guessing thresholds.
- `npm.cmd test`: 85 tests passed
- `npm.cmd run build`: passed

Latest captured-only new-meme cleanup on 2026-06-04:

- User decided the five newly added memes should stop using the old guessed recognition rules and rely on the captured-pose model instead.
- Removed hand-written React-mode rules for `lets-larp`, `no-idea-cuh`, `son`, `tf`, and `zoltraak`.
- Removed hand-written Guide-mode cue matching for those five. Guide now points those targets to recording good/bad examples in Developer instead of pretending there are static thresholds.
- Kept the low-level raw signals such as `Finger gun`, `Prayer hands`, `Look down`, and `Head side` because the captured-pose feature vector still uses them.
- The older five memes still use their existing rules for now.
- `npm.cmd test`: 68 tests passed
- `npm.cmd run build`: passed

Latest pose-capture UX continuation on 2026-06-04:

- User noted the capture flow was unclear, especially for poses requiring both hands because recording started immediately after clicking.
- Pose capture now has a 3-second get-ready countdown before sampling begins.
- Camera overlay now shows `Get ready N` during prep and `Capturing good/bad X%` while frames are being saved.
- Developer capture meter mirrors the same prep/capture state.
- This means the correct workflow is: click `Record good` or `Record bad`, move into the pose during the countdown, then hold until the capture badge disappears.
- `npm.cmd test`: 68 tests passed
- `npm.cmd run build`: passed

Latest partial-hand capture continuation on 2026-06-04:

- User clarified that `lets-larp` may only show half of the hand, not a full hand.
- Important limitation: the current captured-pose model learns from MediaPipe landmark features, so it can support half-hand poses only when MediaPipe detects at least some hand landmarks.
- Changed the good-capture quality guard for `lets-larp` from 70% hand-visible frames to 20% hand-visible frames.
- Captures with 0% hand-visible frames are still rejected for `lets-larp`, because the landmark model has no hand data to learn from.
- `no-idea-cuh` and `son` still require 70% hand-visible frames because those poses depend on both hands being visible.

Latest `lets-larp` captured-threshold continuation on 2026-06-04:

- User reported the imported `lets-larp` captured dataset still did not trigger.
- The latest dataset has usable hand-visible good samples, but the half-hand pose scores lower than the default captured-model trigger threshold.
- Added per-category captured-pose thresholds and lowered only `lets-larp` from 0.62 to 0.50.
- Other captured-only memes still use the default 0.62 threshold.

Latest expanded `lets-larp` dataset continuation on 2026-06-04:

- User added more samples to the `lets-larp` dataset.
- New file inspected: `pose-datasets/memereact-pose-dataset-2026-06-04T18-59-53-330Z.json`.
- Dataset quality: 91 good samples, 122 bad samples, good hand visibility 91/91, bad hand visibility 99/122.
- Leave-one-out score separation: bad examples max around 0.22, good examples average around 0.56 with low edge cases around 0.35.
- Lowered only `lets-larp` captured threshold from 0.50 to 0.35 to support the partial-hand edge cases in this dataset.

Latest `lets-larp` strictness continuation on 2026-06-04:

- User reported `lets-larp` was still too strict.
- Lowered only `lets-larp` captured threshold again from 0.35 to 0.28.
- This remains above the measured bad-sample ceiling of roughly 0.22 from the expanded dataset, while giving more room for live half-hand variation.

Latest `lets-larp` merged dataset continuation on 2026-06-04:

- User added a new `lets-larp` good-only dataset: `memereact-pose-dataset-2026-06-04T19-19-56-807Z.json`.
- The new file contained 24 good samples, 0 bad samples, and all 24 had hand-visible/strong-hand data.
- Those samples scored well against the previous larger good/bad dataset, so no threshold change was needed.
- Created merged testing file: `pose-datasets/2026-06-04-lets-larp-expanded-good-bad-plus-extra-good.json`.
- Merged file contains 115 good samples and 122 bad samples; good hand visibility is 115/115.
- Use the merged file for the next `lets-larp` import/test.

Latest `lets-larp` dataset cleanup on 2026-06-04:

- User asked to merge all pose dataset JSON files and keep only one clearly named `lets-larp` dataset.
- Merged all existing `pose-datasets/*.json` files into `pose-datasets/lets-larp.json`, deduplicated by sample id.
- Deleted the older JSON files from `pose-datasets/`.
- Current canonical `lets-larp` dataset: `pose-datasets/lets-larp.json`.
- Current counts: 115 `lets-larp good`, 122 `lets-larp bad`, 237 total samples.

Latest `lets-larp` final loosen continuation on 2026-06-04:

- User said the trigger is almost there but still slightly strict.
- Lowered only the `lets-larp` captured threshold from 0.28 to 0.25.
- Keep the canonical dataset as `pose-datasets/lets-larp.json`.

Latest `lets-larp` hand-near-head false-positive continuation on 2026-06-04:

- User reported `lets-larp` triggered when the hand was near the head without a finger-gun pose.
- Raised only the `lets-larp` captured threshold back from 0.25 to 0.28.
- Added a live-signal gate for captured `lets-larp` candidates: require at least one hand and reject when `handsOnHead` or `headTouches` is nonzero.
- This keeps the captured model available for the real half-hand pose while blocking the specific hand-near-head false positive.

Latest `lets-larp` hand-near-face false-positive continuation on 2026-06-04:

- User reported `lets-larp` also triggered from a thinking-like full-hand-near-face pose.
- Extended the captured `lets-larp` live gate to reject `handNearFace` and `fingerNearMouth`.
- The intended `lets-larp` pose should keep the hand extended toward the camera, not in the face/mouth thinking zone.

Latest captured-model outlier reduction on 2026-06-04:

- User reported `lets-larp` was still triggered by many wrong poses.
- Changed captured-pose scoring from nearest-single-sample matching to an average of the 5 nearest good samples and 5 nearest bad samples.
- This should reduce false positives caused by one accidental/outlier good sample matching a wrong live pose.
- Canonical `lets-larp.json` still separates under the new scorer: all bad samples are below 0.25, all good samples are above 0.28.
- Kept `lets-larp` threshold at 0.28.
- `npm.cmd test`: 68 tests passed
- `npm.cmd run build`: passed
