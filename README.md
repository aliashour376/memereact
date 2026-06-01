# Meme React

A browser webcam reaction app that detects a small set of gestures and expressions, then shows a matching meme.

Project handoff notes and current tuning decisions are recorded in [`PROJECT_NOTES.md`](./PROJECT_NOTES.md).

## Run

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173/`.

The app runs client-side. Webcam frames stay in the browser. MediaPipe model files are loaded from Google's hosted model storage and the MediaPipe Tasks Vision WASM CDN.

## Meme folders

Place local meme files in:

```text
public/memes/<category>
```

Supported v1 categories:

- `absolute-cinema`
- `we-are-cooked`
- `ah-hell-nah`
- `thinking`
- `happy`

`npm.cmd run dev`, `npm.cmd test`, and `npm.cmd run build` regenerate `src/generated/memeCatalog.ts` from those folders automatically.
