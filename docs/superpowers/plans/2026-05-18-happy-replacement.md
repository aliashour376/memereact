# Happy Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the obsolete `lmao` reaction with a new `happy` reaction backed by the already-added `happy.jpg` meme asset.

**Architecture:** Keep the existing five-category structure, but swap the fifth category from `lmao` to `happy`. Extend the current vision and calibration pipeline with tongue/smile signals, then add a focused `happy` rule that is gated by tongue-out and boosted by smile while leaving the other reaction rules unchanged.

**Tech Stack:** React 19, TypeScript, MediaPipe Tasks Vision, Node test runner, Vite.

---

## File Map

- `src/memeTypes.ts`: active category definitions.
- `scripts/catalog-utils.mjs`, `src/generated/memeCatalog.ts`, `src/memeCatalog.node-test.ts`: generated catalog shape and coverage.
- `src/visionSignals.ts`, `src/visionSignals.node-test.ts`: raw MediaPipe-derived facial signals.
- `src/calibration.ts`, `src/calibration.node-test.ts`: baseline and normalized deltas.
- `src/reactionRules.ts`, `src/reactionRules.node-test.ts`: reaction scoring.
- `src/App.tsx`: labels, developer metrics, and removal of obsolete `lmao` invalidation.
- `README.md`, `PROJECT_NOTES.md`: active documentation.

### Task 1: Replace The Active Category And Catalog

**Files:**
- Modify: `src/memeTypes.ts`
- Modify: `src/memeCatalog.node-test.ts`
- Generated: `src/generated/memeCatalog.ts`

- [ ] **Step 1: Write the failing catalog/category tests**

Update `src/memeCatalog.node-test.ts` so the expected categories are:

```ts
{
  'absolute-cinema': 1,
  'we-are-cooked': 1,
  'ah-hell-nah': 1,
  thinking: 1,
  happy: 1
}
```

and replace:

```ts
assert.match(localMemeCatalog.lmao[0]?.src ?? '', /lmao\.jpg$/);
```

with:

```ts
assert.match(localMemeCatalog.happy[0]?.src ?? '', /happy\.jpg$/);
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run:

```powershell
node --test --experimental-strip-types "src/memeCatalog.node-test.ts"
```

Expected: FAIL because `localMemeCatalog` still contains `lmao` and not `happy`.

- [ ] **Step 3: Replace the category definition**

Update `src/memeTypes.ts` so the fifth category is:

```ts
'happy'
```

instead of:

```ts
'lmao'
```

- [ ] **Step 4: Regenerate the catalog**

Run:

```powershell
npm.cmd run generate:catalog
```

Expected: `src/generated/memeCatalog.ts` contains a `happy` entry pointing at `/memes/happy/happy.jpg`.

- [ ] **Step 5: Re-run the targeted test and verify it passes**

Run:

```powershell
node --test --experimental-strip-types "src/memeCatalog.node-test.ts"
```

Expected: PASS.

### Task 2: Add Tongue And Smile Signals To The Vision Pipeline

**Files:**
- Modify: `src/visionSignals.ts`
- Modify: `src/visionSignals.node-test.ts`
- Modify: `src/calibration.ts`
- Modify: `src/calibration.node-test.ts`

- [ ] **Step 1: Write failing raw-signal and normalization tests**

In `src/visionSignals.node-test.ts`, add a case that passes blendshapes with:

```ts
{ categoryName: 'tongueOut', score: 0.7 },
{ categoryName: 'mouthSmileLeft', score: 0.5 },
{ categoryName: 'mouthSmileRight', score: 0.7 }
```

and expects:

```ts
assert.equal(result.face.tongueOut, 0.7);
assert.equal(result.face.smile, 0.6);
```

In `src/calibration.node-test.ts`, extend `neutralSample`, the live `VisionSignals`, and the expected normalized face output with:

```ts
tongueOut: 0.02,
smile: 0.08,
tongueOutDelta: 0.48,
smileDelta: 0.22
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```powershell
node --test --experimental-strip-types "src/visionSignals.node-test.ts" "src/calibration.node-test.ts"
```

Expected: FAIL because the new properties do not exist yet.

- [ ] **Step 3: Add raw tongue and smile signals**

In `src/visionSignals.ts`:

```ts
export interface FaceSignals {
  // existing fields...
  tongueOut: number;
  smile: number;
}
```

Derive:

```ts
const tongueOut = getBlendshape(blendshapes, 'tongueOut');
const smile = average(
  getBlendshape(blendshapes, 'mouthSmileLeft'),
  getBlendshape(blendshapes, 'mouthSmileRight')
);
```

and include both values in `neutralSignals.face` and the returned `face` object.

- [ ] **Step 4: Add calibration support**

In `src/calibration.ts`, add `tongueOut` and `smile` to `CalibrationSample`, add `tongueOutDelta` and `smileDelta` to `NormalizedFaceSignals`, include the raw values in `toCalibrationSample()`, baseline averaging, missing-face defaults, and normalized output:

```ts
tongueOutDelta: round(Math.max(0, signals.face.tongueOut - baseline.tongueOut)),
smileDelta: round(Math.max(0, signals.face.smile - baseline.smile))
```

- [ ] **Step 5: Re-run the focused tests and verify they pass**

Run:

```powershell
node --test --experimental-strip-types "src/visionSignals.node-test.ts" "src/calibration.node-test.ts"
```

Expected: PASS.

### Task 3: Replace The Deadpan Rule With The Happy Rule

**Files:**
- Modify: `src/reactionRules.ts`
- Modify: `src/reactionRules.node-test.ts`

- [ ] **Step 1: Replace the old `lmao` tests with failing `happy` tests**

Remove the `lmao`-specific assertions and add:

```ts
it('scores happy from tongue out alone', () => {
  const result = evaluateReactionRules({
    ...neutralSignals,
    face: { ...neutralSignals.face, tongueOutDelta: 0.18 }
  });

  assert.equal(result[0]?.category, 'happy');
});

it('raises happy confidence when smile is also present', () => {
  const tongueOnly = evaluateReactionRules({
    ...neutralSignals,
    face: { ...neutralSignals.face, tongueOutDelta: 0.18 }
  });
  const smiling = evaluateReactionRules({
    ...neutralSignals,
    face: { ...neutralSignals.face, tongueOutDelta: 0.18, smileDelta: 0.2 }
  });

  assert.ok((smiling[0]?.score ?? 0) > (tongueOnly[0]?.score ?? 0));
});

it('does not suppress happy while hands are visible', () => {
  const result = evaluateReactionRules({
    ...neutralSignals,
    hands: { ...neutralSignals.hands, handCount: 2 },
    face: { ...neutralSignals.face, tongueOutDelta: 0.18 }
  });

  assert.equal(result[0]?.category, 'happy');
});
```

Add neutral defaults for `tongueOutDelta` and `smileDelta`.

- [ ] **Step 2: Run the targeted test and verify it fails**

Run:

```powershell
node --test --experimental-strip-types "src/reactionRules.node-test.ts"
```

Expected: FAIL because `happy` is not a category yet in the rules and normalized face signals lack the new deltas.

- [ ] **Step 3: Replace the production rule**

In `src/reactionRules.ts`, remove the `lmao` block and add:

```ts
{
  category: 'happy',
  reason: 'tongue out with a smile',
  evaluate: (signals) => {
    const tongue = ramp(signals.face.tongueOutDelta, 0.08, 0.18) * 0.8;
    if (tongue === 0) {
      return 0;
    }

    const smile = ramp(signals.face.smileDelta, 0.08, 0.2) * 0.2;
    return tongue + smile;
  }
}
```

- [ ] **Step 4: Re-run the targeted test and verify it passes**

Run:

```powershell
node --test --experimental-strip-types "src/reactionRules.node-test.ts"
```

Expected: PASS.

### Task 4: Update Runtime Labels And Diagnostics

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the smallest failing compile check**

After Task 1 and Task 2, run:

```powershell
npm.cmd run build
```

Expected: FAIL until the UI label map, normalized defaults, and obsolete `lmao` invalidation are updated.

- [ ] **Step 2: Update UI state and labels**

In `src/App.tsx`:

```ts
happy: 'Happy'
```

Replace the neutral normalized defaults so they include:

```ts
tongueOutDelta: 0,
smileDelta: 0
```

Remove:

```ts
if (nextNormalizedSignals.hands.handCount > 0) {
  invalidatedCategories.add('lmao');
}
```

Add Developer panel metrics:

```tsx
<Metric label="Tongue" value={rawSignals.face.tongueOut.toFixed(2)} />
<Metric label="Smile" value={rawSignals.face.smile.toFixed(2)} />
<Metric label="Tongue d" value={normalizedSignals.face.tongueOutDelta.toFixed(2)} />
<Metric label="Smile d" value={normalizedSignals.face.smileDelta.toFixed(2)} />
```

- [ ] **Step 3: Re-run the build**

Run:

```powershell
npm.cmd run build
```

Expected: PASS.

### Task 5: Update Active Documentation

**Files:**
- Modify: `README.md`
- Modify: `PROJECT_NOTES.md`

- [ ] **Step 1: Update active docs**

Replace active `lmao` mentions with `happy` where they describe the current project state:

- supported categories
- current meme file list
- current pose rule section
- live-testing notes
- next-session handoff

Document `happy` as:

- expected pose: tongue out, with smile helping confidence
- hands do not block it
- next live tuning values: `Tongue`, `Smile`, `Tongue d`, `Smile d`, candidate list

- [ ] **Step 2: Audit active source/docs for stale `lmao` references**

Run:

```powershell
rg -n "lmao" README.md PROJECT_NOTES.md src
```

Expected: no results in active source or active handoff docs.

### Task 6: Run Full Verification

**Files:**
- Verify: whole project

- [ ] **Step 1: Run the full test suite**

Run:

```powershell
npm.cmd test
```

Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run:

```powershell
npm.cmd run build
```

Expected: build passes.

- [ ] **Step 3: Confirm the generated catalog**

Open `src/generated/memeCatalog.ts` and verify it includes `happy` and excludes `lmao`.

## Self-Review

- Spec coverage: category replacement, catalog regeneration, tongue/smile signals, happy rule, runtime cleanup, developer metrics, docs, and verification are each covered by a task.
- Placeholder scan: no `TBD`, `TODO`, or underspecified implementation steps remain.
- Type consistency: `tongueOut`, `smile`, `tongueOutDelta`, and `smileDelta` are used consistently across raw signals, calibration, rules, and UI.
