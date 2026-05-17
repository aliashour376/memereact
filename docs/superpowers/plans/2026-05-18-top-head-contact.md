# Top Head Contact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect top-of-head palm contact for `we-are-cooked` while preserving side-head contact support and clear live-debugging metrics.

**Architecture:** Keep side-head and top-head true-contact checks separate in the vision layer, then derive `headTouches` from their union per hand. Top-head contact uses the measured live separator from the user's feed: palm centers near or above the face top count as top-head contact, while the working `absolute-cinema` pose stays lower in frame. Leave the reaction rules unchanged and surface the new top-contact count in the Developer panel for live tuning.

**Tech Stack:** React 19, TypeScript, Node test runner, MediaPipe Tasks Vision, Vite.

---

## File Map

- `src/visionSignals.ts`: add top-head contact detection and combined touch counting.
- `src/visionSignals.node-test.ts`: add top-head fixtures and regression coverage.
- `src/App.tsx`: expose `Top palms`.
- `PROJECT_NOTES.md`: record the revised live-test guidance.

### Task 1: Add Top-Head Contact Coverage

**Files:**
- Modify: `src/visionSignals.node-test.ts`
- Modify: `src/visionSignals.ts`

- [ ] **Step 1: Write the failing tests**

Add a top-of-head contact test:

```ts
it('detects true palm contact on top of the head', () => {
  const face = createFace();
  const leftTopPalm = createPalmCluster(0.42, 0.15);
  const rightTopPalm = createPalmCluster(0.58, 0.15);

  const result = deriveVisionSignals(
    { landmarks: [leftTopPalm, rightTopPalm] } as never,
    { faceLandmarks: [face], faceBlendshapes: [{ categories: [] }] } as never
  );

  assert.equal(result.hands.topHeadPalmContacts, 2);
  assert.equal(result.hands.headTouches, 2);
});
```

Update the raised-palms test:

```ts
assert.equal(result.hands.topHeadPalmContacts, 0);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm.cmd test -- --test-name-pattern "deriveVisionSignals"
```

Expected: FAIL because `topHeadPalmContacts` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Add the new raw signal:

```ts
topHeadPalmContacts: number;
```

Derive explicit counts:

```ts
const sideHeadPalmContacts = faceBounds ? hands.filter((hand) => isPalmTouchingSideOfHead(hand, faceBounds)).length : 0;
const topHeadPalmContacts = faceBounds ? hands.filter((hand) => isPalmTouchingTopOfHead(hand, faceBounds)).length : 0;
```

Derive `headTouches` from a per-hand union:

```ts
headTouches: faceBounds
  ? hands.filter((hand) =>
      isPalmTouchingSideOfHead(hand, faceBounds) ||
      isPalmTouchingTopOfHead(hand, faceBounds)
    ).length
  : 0,
```

Implement `isPalmTouchingTopOfHead()` with a broad top zone and a palm-center height cutoff based on the live readings:

```ts
const topZone = {
  left: faceBounds.left - width * 1.2,
  right: faceBounds.right + width * 1.2,
  top: faceBounds.top - height * 0.2,
  bottom: faceBounds.top + height * 0.08
};
```

The user's live `we-are-cooked` pose measured `Palm y = -0.01 / -0.10`, while working `absolute-cinema` measured `0.25 / 0.27`, so the vertical cutoff is the reliable separator.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
npm.cmd test -- --test-name-pattern "deriveVisionSignals"
```

Expected: PASS for the vision-signal suite.

### Task 2: Surface Top Contact And Refresh Notes

**Files:**
- Modify: `src/App.tsx`
- Modify: `PROJECT_NOTES.md`

- [ ] **Step 1: Add the developer metric**

```tsx
<Metric label="Top palms" value={rawSignals.hands.topHeadPalmContacts.toString()} />
```

- [ ] **Step 2: Update the handoff notes**

Document that:

- the intended live `we-are-cooked` pose is top-of-head contact,
- `Top palms = 2` and `Head touch = 2` are the expected debug values,
- the next validation should compare upright raised palms with top-head contact using the live `Palm y` split.

- [ ] **Step 3: Run full verification**

```powershell
npm.cmd test
npm.cmd run build
```

Expected: all tests pass and the build completes.

## Self-Review

- Spec coverage: top-head contact, live-measured vertical separation, combined head-touch counting, unchanged reaction rules, and developer visibility are all covered.
- Placeholder scan: no deferred implementation placeholders remain.
- Type consistency: `topHeadPalmContacts` is used consistently across signals, tests, UI, and notes.
