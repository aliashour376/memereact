# Meme React V2 Active Planning Handoff

Last updated: 2026-06-01

This is the active planning handoff for the next Meme React session. Read this first, then read:

- `PROJECT_NOTES.md`
- `docs/superpowers/specs/2026-06-01-v2-recovered-planning-context.md`
- `docs/superpowers/specs/2026-06-01-reaction-clip-booth-v2-design.md`
- `docs/superpowers/plans/2026-06-01-reaction-clip-booth-v2.md`

## User Preference For Planning Format

- Use text-first planning by default.
- Do not open a browser or create visual planning boards for simple planning that can be explained clearly in text.
- For complex planning, suggest a browser/visual board first and explain why it would help.
- Image generation is useful when a visual decision is hard to judge in text. It helped decide the clip export layout.

## Current V2 Direction

V2 should be **Reaction Clip Booth**.

The app should let a user enable reaction clips, perform a reaction, and get a short local clip when the reaction locks. This should feel like the app captured a meme moment, not like a generic webcam recording.

## Locked Decisions

### Product Scope

- V2 is a local-first clip booth.
- No backend in V2.
- No accounts in V2.
- No upload flow in V2.
- No persistent cloud gallery in V2.
- Local meme folders remain supported.
- GIPHY, AI matching, global meme packs, and backend sharing are deferred.
- Meme Pack Studio is still a good later feature, but not the main first V2 slice.
- Pose-match guide is a later separate mode, not part of the first Clip Booth implementation.

### Clip Recording

- Export format: WebM video.
- Default clip length: 3 seconds.
- Recording starts automatically when a reaction locks, but only if reaction clips are enabled.
- Recording must not happen when reaction clips are off.
- Clips stay local unless the user explicitly downloads/exports/shares.
- Preview, discard, and download are required.
- The latest clip can stay in browser memory only.

### Privacy And Consent

- `Reaction clips: Off / On` toggle defaults to `Off`.
- Add separate `Microphone: Off / On` toggle.
- Microphone toggle defaults to `Off`.
- Microphone toggle should appear only when reaction clips are enabled.
- If mic is off:
  - request camera only
  - exported clip has no audio
- If mic is on:
  - request camera + microphone
  - exported clip includes audio
- The app should make recording state obvious:
  - `Recording video`
  - `Recording video + mic`
- Nothing uploads automatically.

### Clip Composition

- Export should use **Overlay Export**.
- This was chosen after generating a side-by-side comparison image of overlay vs side-by-side.
- Side-by-side was clearer, but user chose overlay export because it better matches the desired meme moment.
- Exported clip should include:
  - mirrored camera feed as the base
  - active meme overlaid on the camera video
  - clean reaction label
  - no buttons
  - no Developer panel
  - no debug/status UI
- Recording indicator should be visible in the live app, but should not be baked into the exported clip by default.

## Pending Question For Next Session

Resume planning with this exact question:

**Should the overlay meme appear as a large dramatic reaction image or a smaller sticker-style insert?**

Current recommendation to discuss:

- Large dramatic reaction image for V2.
- Reason: it feels more like a meme moment and less like a utility recording.
- Constraint: position/scale it so it does not fully hide the user's face or the pose that triggered the reaction.

Options to offer:

1. **Large dramatic overlay**
   - More expressive and shareable.
   - Higher risk of covering the face/pose.
   - Best if we design smart placement rules.

2. **Sticker-style insert**
   - Cleaner and less obstructive.
   - Easier to implement.
   - May feel less exciting.

3. **Adaptive overlay**
   - Large when safe, smaller if it would cover the face.
   - Best product behavior, but more implementation complexity.

## Suggested Next Planning Decisions

After the overlay-size question, decide:

1. Overlay placement:
   - bottom-right
   - bottom-left
   - adaptive based on face position

2. Reaction label style:
   - small caption
   - bold meme-title banner
   - short animated stamp

3. Clip timing:
   - 3 seconds starting at reaction lock
   - include a short pre-roll if feasible
   - wait a beat after lock, then capture

4. Audio behavior details:
   - include mic audio for full 3 seconds
   - show mic-on warning before starting camera
   - allow user to change mic setting only before session starts or anytime

5. Export filename:
   - include reaction id and timestamp
   - example: `meme-react-absolute-cinema-2026-06-01.webm`

6. First implementation slice:
   - toggles and consent copy
   - recording state machine
   - canvas composition
   - MediaRecorder export
   - preview/discard/download

## Generated Visual Reference

A generated comparison image was created during planning to compare:

- Overlay Export
- Side-by-Side Export

The image is stored under the Codex generated image folder for this thread:

```text
C:\Users\aasho\.codex\generated_images\019e8333-25b2-74a1-ac9f-7f7a70c63a34
```

The exact generated filename may be an image id. If needed, inspect that folder.

## Important Implementation Constraints

- Keep the existing reaction detection and meme category system intact.
- Do not add backend work in the first clip booth implementation.
- Do not add GIPHY or AI matching in the first clip booth implementation.
- Do not record audio unless the mic toggle is explicitly on.
- Do not hide recording state.
- Do not persist clips automatically.
- Do not upload anything.
- Keep Developer panel available for tuning, but keep it out of exported clips.

## Current Assumption

The next concrete implementation plan should replace the earlier "no audio" assumption with:

> Audio is supported only through a separate explicit microphone toggle, default off.

Any older docs that say "no audio in V2" should be interpreted as superseded by this handoff.
