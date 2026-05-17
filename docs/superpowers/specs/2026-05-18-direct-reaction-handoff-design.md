# Direct Reaction Handoff Design

Date: 2026-05-18

## Context

Live testing confirmed that `absolute-cinema` and `we-are-cooked` now detect correctly, but switching directly from `we-are-cooked` to `absolute-cinema` feels delayed.

The current controller keeps an active reaction alive for up to `1200 ms`. During that hold window, a different valid top candidate does not replace the active reaction; the controller waits for the old hold to expire, then enters cooldown, then waits for the new candidate to become stable. That behavior prevents flicker during short neutral gaps, but it is too conservative for clear pose-to-pose handoffs.

## Goal

Keep the current anti-flicker behavior for brief neutral gaps while allowing one clear pose to replace another promptly once the new pose is stable.

## Chosen Approach

Allow stable direct handoffs between different reaction categories.

- If the same pose remains active, renew it as before.
- If no candidate is present, continue holding the active reaction through the configured neutral-gap window.
- If a different candidate becomes the leader, track how long it remains stable while the old reaction is still active.
- Once the different candidate has been stable for `stabilityMs`, switch directly to it.
- Do not impose cooldown on a clean direct handoff.

## Alternatives Considered

### Lower The Global Hold Time

This would reduce delay, but it would also weaken the useful anti-flicker behavior during short tracking gaps.

### Remove Hold During Any Candidate Change

This would feel fast, but it would make the system vulnerable to noisy one-frame misclassifications.

## Component Changes

### Reaction Controller

- Reuse the existing candidate-stability tracking while an active reaction is present.
- Permit a different stable leading candidate to replace the active reaction before `heldUntil`.
- Preserve current invalidation behavior and neutral-gap hold behavior.

### App Configuration

- Keep the existing timing constants for now:
  - `stabilityMs = 260`
  - `holdMs = 1200`
  - `cooldownMs = 260`

## Testing

Add tests for:

- A different candidate does not immediately replace an active reaction on the first frame.
- A different candidate replaces the active reaction once it has been stable for the configured stability window.
- Brief neutral gaps still keep the current active reaction alive.
- Direct handoff does not enter cooldown.

## Out Of Scope

- Tuning `lmao`.
- Changing detector geometry.
- Redesigning the UI.
