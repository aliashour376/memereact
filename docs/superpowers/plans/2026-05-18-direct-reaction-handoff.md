# Direct Reaction Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one stable reaction replace another directly while preserving hold behavior for brief neutral gaps.

**Architecture:** Extend the existing reaction controller rather than changing app-level timing. While an active reaction is held, track a different leading candidate using the same stability mechanism already used for first activation, then preempt once it has remained stable long enough.

**Tech Stack:** TypeScript, Node test runner.

---

## File Map

- `src/reactionState.node-test.ts`: add handoff regression tests.
- `src/reactionState.ts`: implement stable direct switching.
- `PROJECT_NOTES.md`: record the refined handoff behavior after verification.

### Task 1: Add Direct-Handoff Tests

**Files:**
- Modify: `src/reactionState.node-test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that verify:

```ts
it('waits for a different candidate to become stable before switching', () => {
  const controller = createReactionController({ stabilityMs: 100, holdMs: 900, cooldownMs: 250 });
  const cooked = [{ category: 'we-are-cooked' as const, score: 0.95, reason: 'head touch' }];
  const cinema = [{ category: 'absolute-cinema' as const, score: 0.95, reason: 'raised palms' }];

  controller.update(cooked, 1000);
  controller.update(cooked, 1120);

  assert.equal(controller.update(cinema, 1200).activeReaction?.category, 'we-are-cooked');
  assert.equal(controller.update(cinema, 1310).activeReaction?.category, 'absolute-cinema');
});
```

```ts
it('does not enter cooldown during a direct handoff', () => {
  const controller = createReactionController({ stabilityMs: 100, holdMs: 900, cooldownMs: 250 });
  const cooked = [{ category: 'we-are-cooked' as const, score: 0.95, reason: 'head touch' }];
  const cinema = [{ category: 'absolute-cinema' as const, score: 0.95, reason: 'raised palms' }];

  controller.update(cooked, 1000);
  controller.update(cooked, 1120);
  controller.update(cinema, 1200);
  const switched = controller.update(cinema, 1310);

  assert.equal(switched.activeReaction?.category, 'absolute-cinema');
  assert.equal(switched.coolingDownUntil, 0);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
npm.cmd test -- --test-name-pattern "createReactionController"
```

Expected: new handoff tests fail because the old reaction remains active.

### Task 2: Implement Stable Direct Handoff

**Files:**
- Modify: `src/reactionState.ts`

- [ ] **Step 1: Write minimal implementation**

Inside the active-reaction path:

- keep renewing when `topCandidate.category === activeReaction.category`,
- when `topCandidate.category !== activeReaction.category`, track that candidate and its `candidateSince`,
- once `now - candidateSince >= config.stabilityMs`, replace `activeReaction` immediately with the new candidate and set `heldUntil = now + config.holdMs`,
- return without setting cooldown.

- [ ] **Step 2: Run focused tests and verify GREEN**

```powershell
npm.cmd test -- --test-name-pattern "createReactionController"
```

Expected: all controller tests pass.

### Task 3: Verify And Document

**Files:**
- Modify: `PROJECT_NOTES.md`

- [ ] **Step 1: Update notes**

Record that:

- direct pose-to-pose handoffs now switch after the normal stability window,
- neutral-gap hold behavior remains unchanged,
- next work after live validation is `lmao`.

- [ ] **Step 2: Run full verification**

```powershell
npm.cmd test
npm.cmd run build
```

Expected: tests pass and build completes.

## Self-Review

- Spec coverage: direct handoff, preserved neutral hold, and no cooldown on clean switch are all covered.
- Placeholder scan: no deferred steps remain.
- Type consistency: no new types are required.
