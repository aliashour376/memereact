# Happy Replacement Design

Date: 2026-05-18

## Context

The `lmao` reaction is being removed entirely. The user added a new meme asset at:

- `public/memes/happy/happy.jpg`

The replacement reaction should represent "life is happy and sunshine." The primary gesture should be a visible tongue sticking out, with happiness/smile cues increasing confidence. Hands should not affect the `happy` rule.

## Goal

Replace `lmao` with a new `happy` reaction end to end, with no remaining `lmao` category behavior or references in the active project.

## Chosen Approach

- Remove `lmao` from all active category lists, generated catalog inputs, labels, reaction rules, tests, docs, and runtime special cases.
- Add `happy` as the fifth meme category.
- Add facial signals for:
  - tongue-out
  - smile
- Use tongue-out as the required admission signal for `happy`.
- Use smile as an additive confidence boost.
- Ignore hands when evaluating `happy`.

## Alternatives Considered

### Tongue-Out And Smile Both Required

This is stricter, but it risks missing valid happy reactions when the model sees the tongue clearly but reports only a modest smile score.

### Keep `lmao` And Add `happy`

This would preserve a reaction the user no longer wants and leave dead-end tuning work in the project.

## Component Changes

### Meme Categories And Catalog

- Replace `lmao` with `happy` in supported category definitions.
- Regenerate the local catalog so `happy.jpg` is included and the old `lmao` entry disappears.
- Remove the old `public/memes/lmao/` asset folder from the active meme set.

### Vision Signals

- Add raw face values for:
  - `tongueOut`
  - `smile`
- Add normalized deltas for those values so the reaction can compare live expression against calibration baseline.

### Reaction Rules

- Remove the `lmao` rule entirely.
- Add a `happy` rule:
  - tongue-out delta is the required gate,
  - smile delta increases the final score,
  - hand presence does not block it.

### Runtime State

- Remove the `lmao` invalidation path that currently clears deadpan reactions when hands appear.
- No special invalidation should be needed for `happy`.

### Developer Panel

- Expose raw and normalized tongue/smile values so the new reaction can be tuned live if needed.

### Documentation

- Replace all active `lmao` references in the project notes and README with `happy`.
- Retain historical design docs as documents unless they are explicitly scoped to current active behavior. The active codebase and handoff docs should have no live `lmao` category.

## Data Flow

1. MediaPipe face blendshapes produce tongue and smile values.
2. Calibration records neutral baselines for those values.
3. Normalization computes live deltas.
4. The `happy` rule evaluates tongue-out first, then adds smile confidence.
5. The meme source resolves an image from `public/memes/happy/`.

## Testing

Add or update tests for:

- the generated catalog includes `happy` and excludes `lmao`,
- tongue-out alone can make `happy` a candidate,
- smile raises `happy` confidence,
- hands do not suppress `happy`,
- removed `lmao` tests no longer exist,
- no active source files or active handoff docs retain `lmao` references after replacement.

## Post-Implementation Audit

After implementation, run an independent agent review that searches the project for remaining `lmao` references and checks whether any active behavior still depends on them.

## Out Of Scope

- Retuning unrelated reactions.
- Reworking the overall category count.
- Changing the app's visual direction.
