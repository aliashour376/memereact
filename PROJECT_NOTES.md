# Meme React Project Notes

Last updated: 2026-06-01

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

## Current live-testing notes

- `absolute-cinema` vs `we-are-cooked`: true head-contact separation has been implemented and needs live validation.
- `absolute-cinema`: expected to trigger from two raised open palms that are not touching the sides or top of the head.
- `we-are-cooked`: expected to begin scoring when both palms are truly touching the top or sides of the head; a normal open mouth and slightly wider eyes should improve confidence.
- Direct handoffs between valid poses should feel responsive once the new pose stays stable for roughly a quarter second.
- `ah-hell-nah`: user reported it is working.
- `thinking`: should now require the visible finger cue instead of any hand near the face.
- `happy`: expected to trigger from tongue out; smile should increase confidence but should not trigger by itself.

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
