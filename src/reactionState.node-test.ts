import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createReactionController } from './reactionState.ts';

describe('createReactionController', () => {
  it('requires a candidate to stay stable before activation', () => {
    const controller = createReactionController({
      stabilityMs: 250,
      holdMs: 900,
      cooldownMs: 250
    });
    const candidate = [{ category: 'absolute-cinema' as const, score: 0.95, reason: 'thumbs up' }];

    assert.equal(controller.update(candidate, 1000).activeReaction, null);
    assert.equal(controller.update(candidate, 1200).activeReaction, null);
    assert.equal(controller.update(candidate, 1260).activeReaction?.category, 'absolute-cinema');
  });

  it('holds an active reaction through short neutral gaps', () => {
    const controller = createReactionController({
      stabilityMs: 100,
      holdMs: 900,
      cooldownMs: 250
    });
    const candidate = [{ category: 'absolute-cinema' as const, score: 0.95, reason: 'thumbs up' }];

    controller.update(candidate, 1000);
    controller.update(candidate, 1120);

    assert.equal(controller.update([], 1500).activeReaction?.category, 'absolute-cinema');
  });

  it('enters cooldown after a held reaction expires', () => {
    const controller = createReactionController({
      stabilityMs: 100,
      holdMs: 200,
      cooldownMs: 300
    });
    const candidate = [{ category: 'absolute-cinema' as const, score: 0.95, reason: 'thumbs up' }];

    controller.update(candidate, 1000);
    controller.update(candidate, 1120);
    const expired = controller.update([], 1400);

    assert.equal(expired.activeReaction, null);
    assert.equal(expired.coolingDownUntil, 1700);
  });

  it('renews an active reaction while the same pose remains present', () => {
    const controller = createReactionController({
      stabilityMs: 100,
      holdMs: 200,
      cooldownMs: 300
    });
    const candidate = [{ category: 'absolute-cinema' as const, score: 0.95, reason: 'thumbs up' }];

    controller.update(candidate, 1000);
    controller.update(candidate, 1120);
    const renewed = controller.update(candidate, 1280);
    const stillActive = controller.update(candidate, 1400);

    assert.equal(renewed.activeReaction?.category, 'absolute-cinema');
    assert.equal(stillActive.activeReaction?.category, 'absolute-cinema');
    assert.equal(stillActive.coolingDownUntil, 0);
  });

  it('interrupts an active reaction immediately when it becomes invalid', () => {
    const controller = createReactionController({
      stabilityMs: 100,
      holdMs: 900,
      cooldownMs: 250
    });
    const lmao = [{ category: 'lmao' as const, score: 0.95, reason: 'deadpan' }];

    controller.update(lmao, 1000);
    controller.update(lmao, 1120);
    const interrupted = controller.update([], 1200, new Set(['lmao']));

    assert.equal(interrupted.activeReaction, null);
  });

  it('waits for a different candidate to become stable before switching', () => {
    const controller = createReactionController({
      stabilityMs: 100,
      holdMs: 900,
      cooldownMs: 250
    });
    const cooked = [{ category: 'we-are-cooked' as const, score: 0.95, reason: 'head touch' }];
    const cinema = [{ category: 'absolute-cinema' as const, score: 0.95, reason: 'raised palms' }];

    controller.update(cooked, 1000);
    controller.update(cooked, 1120);

    assert.equal(controller.update(cinema, 1200).activeReaction?.category, 'we-are-cooked');
    assert.equal(controller.update(cinema, 1310).activeReaction?.category, 'absolute-cinema');
  });

  it('does not enter cooldown during a direct handoff', () => {
    const controller = createReactionController({
      stabilityMs: 100,
      holdMs: 900,
      cooldownMs: 250
    });
    const cooked = [{ category: 'we-are-cooked' as const, score: 0.95, reason: 'head touch' }];
    const cinema = [{ category: 'absolute-cinema' as const, score: 0.95, reason: 'raised palms' }];

    controller.update(cooked, 1000);
    controller.update(cooked, 1120);
    controller.update(cinema, 1200);
    const switched = controller.update(cinema, 1310);

    assert.equal(switched.activeReaction?.category, 'absolute-cinema');
    assert.equal(switched.coolingDownUntil, 0);
  });
});
