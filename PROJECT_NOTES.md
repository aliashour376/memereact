# Meme React Project Notes

Last updated: 2026-05-18

## Project reset

- The old Diane-based app was replaced with a fresh Meme React app.
- Old legacy reaction names such as `cringe` and `shocked` were removed from the actual meme categories.
- The app now uses only these meme-native categories:
  - `absolute-cinema`
  - `we-are-cooked`
  - `ah-hell-nah`
  - `thinking`
  - `lmao`

## Current meme files

- `public/memes/absolute-cinema/absolute cinema.jpg`
- `public/memes/we-are-cooked/we are cooked.jpg`
- `public/memes/ah-hell-nah/ah hell nah.jpg`
- `public/memes/thinking/thinks.jpg`
- `public/memes/lmao/lmao.jpg`

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
- Open-mouth and eye-widening cues now increase confidence, but they are no longer required for the pose to become a candidate.
- User preference: it should not require an extreme expression; a normal open mouth with slightly wide eyes should be enough.

### `ah-hell-nah`

- Expected user pose: looking upward in shock.
- Current code requirement: upward head tilt plus some mouth opening.
- User reported this one is currently working well.

### `thinking`

- Expected user pose: finger or hand near mouth/chin.
- Current code requirement: hand in the mouth/chin zone, not merely anywhere near the face.
- This was narrowed because the old version triggered whenever a hand was visible near the head.
- User reported this one is currently working well.

### `lmao`

- Intended meaning: deadpan / not amused reaction, matching the meme image rather than literal laughter.
- Expected user pose:
  - no hands visible
  - face looking forward
  - mouth closed
  - relaxed eyes
  - slight downturned or unimpressed mouth
- Current code blocks `lmao` if any hand is visible or if the face is expressive enough to resemble another pose.
- This rule was made conservative because earlier it was incorrectly taking over when hands were on camera.
- User reported that `lmao` has not shown reliably yet.

## Issues already fixed

1. Camera startup overlay could look stuck after pressing Start.
   - Added explicit `Requesting camera` and `Loading vision` states.
   - Added a model-load timeout with a useful error message.

2. Old Diane-era category names caused confusion and mismatched photos.
   - Removed legacy category naming and aligned the app with meme-native IDs.

3. Reactions flickered on and off while a pose was still being held.
   - The active reaction now renews while the same pose remains present.

4. `lmao` used to win when hands appeared in frame.
   - `lmao` now returns no score when any hands are visible.
   - Active `lmao` is immediately invalidated when hands appear.

5. `absolute-cinema` and `we-are-cooked` overlapped too much.
   - The original broad `handsOnHead` split was replaced with a more specific `sideHeadPalmContacts` signal.
   - `absolute-cinema` now requires raised open palms with no true head contact.
   - `we-are-cooked` moved toward contact-based gating instead of relying only on expression cues.

6. `we-are-cooked` still failed live even when `On head = 2`.
   - Added a stricter `headTouches` signal for actual clustered palm contact on the head.
   - `we-are-cooked` now starts scoring from `Head touch = 2`, with `Mouth d` and `Eyes d` acting as confidence boosts.

## Current live-testing notes

- `absolute-cinema` vs `we-are-cooked`: true head-contact separation has now been implemented and needs live validation.
- `absolute-cinema`: expected to trigger from two raised open palms that are not touching the sides of the head.
- `we-are-cooked`: expected to begin scoring when both palms are truly touching the head; a normal open mouth and slightly wider eyes should improve confidence.
- `ah-hell-nah`: user reported it is working.
- `thinking`: user reported it is working.
- `lmao`: still needs live tuning.

## Next useful test for `lmao`

Try this exact pose:

1. Keep both hands fully out of frame.
2. Look straight into the camera.
3. Keep your mouth closed.
4. Keep your eyes relaxed, not wide and not squinting.
5. Make a mild unimpressed face with the mouth corners slightly down.
6. Hold the pose for about one second.

If `lmao` still does not appear, open the Developer panel and record these values while holding the deadpan pose:

- `Hands`
- `Frown`
- `Mouth d`
- `Eyes d`
- `Head up d`
- candidate list

Those values should be used for the next tuning pass instead of guessing.

## Next useful live test for `absolute-cinema` vs `we-are-cooked`

Open the Developer panel and compare these two poses:

1. `absolute-cinema`
   - raise both open palms clearly away from the sides of the head
   - expected debug values: `Open palms = 2`, `Head touch = 0`
2. `we-are-cooked`
   - press both palms against the left and right sides of the head
   - expected debug values: `Head touch = 2`

If either pose still misfires, record:

- `Open palms`
- `On head`
- `Head touch`
- `Side palms`
- `Mouth d`
- `Eyes d`
- candidate list

## Next-session handoff

- First thing when resuming this project: ask the user whether they want the dev server started so they can live-test the new `absolute-cinema` versus `we-are-cooked` separation.
- This live test was deferred on 2026-05-17 because the user needed to shut down their laptop due to low battery.
- Do **not** move on to `lmao` tuning until the user has had a chance to validate the new true head-contact behavior live.

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

Latest verified state on 2026-05-18:

- `npm.cmd test`: 29 tests passed
- `npm.cmd run build`: passed
