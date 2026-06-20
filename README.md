# Meme React

A browser webcam reaction app that detects a small set of gestures and expressions, then shows a matching meme.

The stable 2.0 release includes five reactions, live pose coaching, and optional local reaction clips.

Project handoff notes and current tuning decisions are recorded in [`PROJECT_NOTES.md`](./PROJECT_NOTES.md).

## Run

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173/`.

The app runs client-side. Webcam frames stay in the browser. MediaPipe model files are loaded from Google's hosted model storage and the MediaPipe Tasks Vision WASM CDN.

## Reaction clips

Reaction clips are opt-in and default to off. When enabled, the app records a 3-second local WebM after a reaction locks, shows a preview, and lets you download or discard it. Microphone audio has a separate default-off toggle and is only requested when that toggle is on.

## Meme folders

Place local meme files in:

```text
public/memes/<category>
```

Supported reactions:

- `absolute-cinema`
- `we-are-cooked`
- `ah-hell-nah`
- `thinking`
- `happy`

`npm.cmd run dev`, `npm.cmd test`, and `npm.cmd run build` regenerate `src/generated/memeCatalog.ts` from those folders automatically.
