# Top Head Contact Design

Date: 2026-05-18

## Context

Live testing of the new `headTouches` signal showed:

- `Hands = 2`
- `Open palms = 2`
- `On head = 0`
- `Side palms = 0`
- `Head touch = 0`

The user clarified that their intended `we-are-cooked` pose places both palms mainly on top of the head, not beside the temples or ears.

The current geometry is biased toward side-of-head contact and only allows a shallow strip above the forehead. That means a valid top-of-head pose can remain invisible to every head-contact metric even while both hands are tracked correctly.

## Goal

Recognize true top-of-head palm contact for `we-are-cooked` without weakening the existing separation from `absolute-cinema`.

## Chosen Approach

Add a dedicated top-head palm-contact signal and combine it with side-head contact when computing total head touches.

- Keep `sideHeadPalmContacts` for side contact.
- Add `topHeadPalmContacts` for palms resting on top of the head.
- Define `headTouches` as the total number of hands that satisfy either side-head or top-head true-contact geometry.
- Keep `we-are-cooked` gated by `headTouches >= 2`.
- Expose `Top palms` in the Developer panel so live testing shows which geometry is firing.

## Alternatives Considered

### Expand The Existing Head-Touch Zone

This would be the smallest code change, but it would make one broad detector responsible for multiple different hand placements. That would make future tuning harder and would hide whether a live result came from side or top contact.

### Use Only Top-Head Detection

This would match the user's current pose, but it would discard a valid side-head variant that already has value for this meme and could work for other users.

## Component Changes

### Vision Signals

- Add `topHeadPalmContacts` to the raw hand signals.
- Split side and top true-contact checks into explicit helpers.
- Count `headTouches` from the union of those per-hand checks so a hand is counted once even if it overlaps more than one zone.

### Reaction Rules

- No rule redesign is needed.
- `we-are-cooked` should continue using `headTouches >= 2`.
- `absolute-cinema` should continue being blocked by any true head contact.

### Developer Panel

- Add `Top palms` beside `On head`, `Head touch`, and `Side palms`.

## Data Flow

1. The hand landmarks are evaluated against side-head and top-head true-contact zones.
2. The app records side count, top count, and combined true-contact count.
3. Reaction rules consume only the combined `headTouches` value.
4. The Developer panel exposes all three values for live tuning.

## Testing

Add focused tests for:

- Two top-of-head palm clusters produce `topHeadPalmContacts = 2`.
- Two top-of-head palm clusters also produce `headTouches = 2`.
- Raised palms above the head but not touching it still produce `headTouches = 0`.
- Existing side-head contact tests continue to pass unchanged.

## Out Of Scope

- Further retuning of `lmao`.
- Changes to facial-expression scoring.
- Visual redesign work.
