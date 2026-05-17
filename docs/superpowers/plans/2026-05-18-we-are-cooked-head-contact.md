# We Are Cooked Head Contact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `we-are-cooked` begin scoring when both hands are truly touching the head, while keeping it distinct from `absolute-cinema`.

**Architecture:** Add a dedicated palm-cluster head-contact signal in the vision layer, carry it through the existing normalized signal shape unchanged, and update the reaction layer so two true contacts are enough to create a candidate while facial cues only raise confidence. Expose the new metric in the Developer panel so live tuning can distinguish broad head overlap from actual head contact.

**Tech Stack:** React 19, TypeScript, Node test runner, MediaPipe Tasks Vision, Vite.

---

## File Map

- `src/visionSignals.ts`: define and derive the new true-contact hand signal.
- `src/visionSignals.node-test.ts`: cover true contact versus broad overlap.
- `src/reactionRules.ts`: update candidate scoring and the `absolute-cinema` exclusion.
- `src/reactionRules.node-test.ts`: cover contact-only scoring, expression boosting, and category separation.
- `src/App.tsx`: surface the new metric in the Developer panel.
- `PROJECT_NOTES.md`: update the handoff notes after implementation and verification.

### Task 1: Add True Head Contact Signal

**Files:**
- Modify: `src/visionSignals.node-test.ts`
- Modify: `src/visionSignals.ts`

- [ ] **Step 1: Write the failing tests**

Add this assertion to the raised-palms test so near-head hands remain distinct from real contact:

```ts
assert.equal(result.hands.headTouches, 0);
```

Add a new test for true contact:

```ts
it('detects true palm contact on both sides of the head', () => {
  const face = createFace();
  const leftPalm = createPalmCluster(0.24, 0.38);
  const rightPalm = createPalmCluster(0.76, 0.38);

  const result = deriveVisionSignals(
    { landmarks: [leftPalm, rightPalm] } as never,
    { faceLandmarks: [face], faceBlendshapes: [{ categories: [] }] } as never
  );

  assert.equal(result.hands.headTouches, 2);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm.cmd test -- --test-name-pattern "deriveVisionSignals"
```

Expected: FAIL because `headTouches` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Update the hand signal interface and neutral state:

```ts
headTouches: number;
```

```ts
headTouches: 0,
```

Derive the count from a dedicated helper:

```ts
headTouches: faceBounds ? hands.filter((hand) => isPalmTouchingHead(hand, faceBounds)).length : 0,
```

Implement `isPalmTouchingHead()` using clustered palm landmarks inside tight left, right, and top head-contact zones so broad overlap does not count as touch.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
npm.cmd test -- --test-name-pattern "deriveVisionSignals"
```

Expected: PASS for the vision-signal tests.

- [ ] **Step 5: Commit**

```powershell
git add src/visionSignals.ts src/visionSignals.node-test.ts
git commit -m "feat: add true head contact signal"
```

### Task 2: Make Head Contact The We-Are-Cooked Gate

**Files:**
- Modify: `src/reactionRules.node-test.ts`
- Modify: `src/reactionRules.ts`

- [ ] **Step 1: Write the failing tests**

Add `headTouches: 0` to the shared neutral hand signals.

Add a contact-only test:

```ts
it('scores we are cooked from two true head touches without expression cues', () => {
  const result = evaluateReactionRules({
    ...neutralSignals,
    hands: { ...neutralSignals.hands, headTouches: 2, handCount: 2 }
  });

  assert.equal(result[0]?.category, 'we-are-cooked');
});
```

Add an expression-boost test:

```ts
it('raises we are cooked confidence when expression cues are also present', () => {
  const touchOnly = evaluateReactionRules({
    ...neutralSignals,
    hands: { ...neutralSignals.hands, headTouches: 2, handCount: 2 }
  });
  const expressive = evaluateReactionRules({
    ...neutralSignals,
    hands: { ...neutralSignals.hands, headTouches: 2, handCount: 2 },
    face: { ...neutralSignals.face, mouthOpenDelta: 0.18, eyeOpennessDelta: 0.12 }
  });

  assert.ok((expressive[0]?.score ?? 0) > (touchOnly[0]?.score ?? 0));
});
```

Update the existing separation test so `absolute-cinema` is blocked by `headTouches: 2`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm.cmd test -- --test-name-pattern "evaluateReactionRules"
```

Expected: FAIL because `we-are-cooked` still depends on `sideHeadPalmContacts` and `headTouches` is not read.

- [ ] **Step 3: Write the minimal implementation**

Update `absolute-cinema`:

```ts
signals.hands.headTouches === 0 &&
signals.hands.raisedOpenPalms >= 2
```

Update `we-are-cooked`:

```ts
const hands = signals.hands.headTouches >= 2 ? 0.5 : 0;
const mouth = ramp(signals.face.mouthOpenDelta, 0.08, 0.22) * 0.3;
const eyes = ramp(signals.face.eyeOpennessDelta, 0.05, 0.16) * 0.2;
return hands + mouth + eyes;
```

The `0.5` base score clears the current `0.45` candidate threshold on touch alone.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
npm.cmd test -- --test-name-pattern "evaluateReactionRules"
```

Expected: PASS for the reaction-rule tests.

- [ ] **Step 5: Commit**

```powershell
git add src/reactionRules.ts src/reactionRules.node-test.ts
git commit -m "fix: gate cooked pose on true head contact"
```

### Task 3: Surface The New Signal And Update Notes

**Files:**
- Modify: `src/App.tsx`
- Modify: `PROJECT_NOTES.md`

- [ ] **Step 1: Add the developer-panel metric**

Add a metric beside the existing head-related values:

```tsx
<Metric label="Head touch" value={rawSignals.hands.headTouches.toString()} />
```

- [ ] **Step 2: Update project notes**

Document that:

- `we-are-cooked` now uses true head contact as its admission signal.
- `Mouth d` and `Eyes d` are confidence boosters rather than hard gates.
- The next live test should compare `On head`, `Head touch`, and `Side palms`.

- [ ] **Step 3: Run the full verification suite**

Run:

```powershell
npm.cmd test
npm.cmd run build
```

Expected: tests pass and the production build completes successfully.

- [ ] **Step 4: Commit**

```powershell
git add src/App.tsx PROJECT_NOTES.md
git commit -m "docs: expose head touch tuning signal"
```

## Self-Review

- Spec coverage: every approved design requirement is represented by a task.
- Placeholder scan: no `TBD`, `TODO`, or deferred implementation steps remain.
- Type consistency: `headTouches` is used consistently in the hand-signal interface, tests, reaction rules, developer panel, and notes.
