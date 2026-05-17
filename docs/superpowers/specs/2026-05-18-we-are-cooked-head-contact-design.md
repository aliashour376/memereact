# We Are Cooked Head Contact Design

Date: 2026-05-18

## Context

Live testing showed that `absolute-cinema` now identifies correctly, but `we-are-cooked` never enters consideration even when the Developer panel reports `On head = 2`.

The current implementation has two different concepts:

- `handsOnHead`: a broad overlap detector that can be true when hands are merely near the head region.
- `sideHeadPalmContacts`: a stricter side-of-head detector that currently gates `we-are-cooked`.

The observed failure means the broad overlap signal is not sufficient for the intended gesture, while the current strict side-palm signal is too narrow to reliably recognize real head touching in live use.

## Goal

Make `we-are-cooked` begin scoring when both hands are actually touching the head, without reintroducing confusion with `absolute-cinema`.

## Chosen Approach

Add a new true-contact hand signal dedicated to head touching.

- The new signal should count a hand only when palm landmarks cluster inside tight head-contact zones.
- It should be separate from the existing broad `handsOnHead` metric so the Developer panel can distinguish "near/on the head region" from "actually touching the head."
- `we-are-cooked` should start scoring as soon as true head contact reaches `2`.
- Mouth opening and wider eyes should increase the final score, but they should not be required for the gesture to become a candidate.
- `absolute-cinema` should remain blocked whenever both hands are in true head contact.

## Alternatives Considered

### Reuse `handsOnHead`

This would make `we-are-cooked` react immediately to the value already visible in the Developer panel, but it would also reuse the broad detector that previously blurred the boundary with `absolute-cinema`.

### Keep `sideHeadPalmContacts` as the only gate

This preserves the strictest existing separator, but the live test already showed that the current signal is missing the intended real-world pose. It would keep the failure mode in place.

## Component Changes

### Vision Signals

- Introduce a dedicated true head-contact count in `visionSignals.ts`.
- Keep `handsOnHead` for broad debugging context.
- Keep or reuse the existing side-palm logic where helpful, but ensure the new contact signal reflects actual palm contact rather than simple proximity.

### Reaction Rules

- Update `we-are-cooked` so two true head contacts provide the base score required to enter the candidate list.
- Keep facial cues additive so a matching expression improves confidence without blocking recognition.
- Update `absolute-cinema` so true head contact prevents it from winning over `we-are-cooked`.

### Developer Panel

- Expose the new true-contact metric alongside `On head` and `Side palms`.
- This should make live tuning legible:
  - `On head = 2` can mean broad overlap.
  - `Head touch = 2` should mean the pose is eligible for `we-are-cooked`.

## Data Flow

1. MediaPipe hand and face landmarks are converted into raw hand and face signals.
2. Raw hand signals include both broad head overlap and stricter true head contact.
3. Calibration normalizes only the facial features; hand-contact counts pass through unchanged.
4. Reaction rules evaluate the normalized signal bundle.
5. `we-are-cooked` becomes a candidate once true head contact reaches `2`, with expression cues raising the score.

## Error Handling And Boundaries

- If no face is present, head-contact signals should remain `0` because the zones cannot be derived.
- The new detector should not rely on a single landmark point; it should require clustered palm evidence to reduce false positives from a fingertip brushing the face region.
- The rule should stay conservative for one-hand poses so `thinking` and incidental gestures are not displaced.

## Testing

Add focused tests for:

- Two hands in true contact zones produce a true head-contact count of `2`.
- Raised open palms near the head do not produce true head contact.
- `we-are-cooked` is listed as a candidate from two true head contacts even with neutral face deltas.
- Facial cues increase `we-are-cooked` confidence above the contact-only baseline.
- `absolute-cinema` does not score when true head contact is present.

## Out Of Scope

- Retuning `lmao`.
- Reworking the entire gesture model.
- Changing meme assets or the current visual direction.
