# Pose Datasets

This folder is for exported Meme React pose-capture JSON files.

The app records pose examples in the Developer panel under `Captured pose model`.
Those captures are saved in browser storage immediately, so they can affect live recognition without using this folder.

Use this folder when you want to keep pose data permanently in the repo, share it for tuning, or turn it into tests/default models later.

## Suggested Workflow

1. Start the app and finish calibration.
2. Open `Developer`.
3. Pick the target meme in `Captured pose model`.
4. Record several `good` examples for acceptable versions of the pose.
5. Record several `bad` examples for similar poses that should not trigger.
6. Click `Download JSON`.
7. Move the downloaded file into this folder.

## File Naming

Use this pattern:

```text
YYYY-MM-DD-meme-id-short-note.json
```

Examples:

```text
2026-06-04-lets-larp-first-pass.json
2026-06-04-lets-larp-good-and-bad.json
2026-06-04-son-prayer-hands.json
```

## What Helps Recognition

Good examples help the app learn what should count.
Bad examples are just as important because they teach the model what to reject.

For each hard meme, aim for:

- 10-20 good examples from natural successful poses
- 10-20 bad examples from close-but-wrong poses
- a few examples with different distance from the camera
- a few examples with small natural mistakes

Do not save camera video or screenshots here. Save only exported pose dataset JSON.
