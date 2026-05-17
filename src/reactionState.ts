import type { MemeCategory } from './memeTypes.ts';
import type { ReactionCandidate } from './reactionRules.ts';

export interface ActiveReaction extends ReactionCandidate {
  startedAt: number;
  heldUntil: number;
}

export interface ReactionControllerConfig {
  stabilityMs: number;
  holdMs: number;
  cooldownMs: number;
}

export interface ReactionControllerState {
  activeReaction: ActiveReaction | null;
  leadingCandidate: ReactionCandidate | null;
  stableForMs: number;
  coolingDownUntil: number;
}

export function createReactionController(config: ReactionControllerConfig) {
  let activeReaction: ActiveReaction | null = null;
  let candidate: ReactionCandidate | null = null;
  let candidateSince = 0;
  let coolingDownUntil = 0;

  return {
    update(
      candidates: ReactionCandidate[],
      now: number,
      invalidatedCategories: ReadonlySet<MemeCategory> = new Set()
    ): ReactionControllerState {
      const topCandidate = candidates[0] ?? null;

      if (activeReaction && invalidatedCategories.has(activeReaction.category)) {
        activeReaction = null;
        candidate = null;
        candidateSince = 0;
        coolingDownUntil = 0;

        return {
          activeReaction: null,
          leadingCandidate: topCandidate,
          stableForMs: 0,
          coolingDownUntil
        };
      }

      if (activeReaction && now <= activeReaction.heldUntil) {
        if (topCandidate?.category === activeReaction.category) {
          candidate = topCandidate;
          candidateSince = now;
          activeReaction = {
            ...topCandidate,
            startedAt: activeReaction.startedAt,
            heldUntil: now + config.holdMs
          };
        } else if (topCandidate) {
          if (candidate?.category !== topCandidate.category) {
            candidate = topCandidate;
            candidateSince = now;
          }

          if (now - candidateSince >= config.stabilityMs) {
            activeReaction = {
              ...topCandidate,
              startedAt: now,
              heldUntil: now + config.holdMs
            };
          }
        } else {
          candidate = null;
          candidateSince = 0;
        }

        return {
          activeReaction,
          leadingCandidate: topCandidate,
          stableForMs: topCandidate?.category === candidate?.category ? now - candidateSince : 0,
          coolingDownUntil
        };
      }

      if (activeReaction && now > activeReaction.heldUntil) {
        if (topCandidate?.category === activeReaction.category) {
          activeReaction = {
            ...topCandidate,
            startedAt: activeReaction.startedAt,
            heldUntil: now + config.holdMs
          };

          return {
            activeReaction,
            leadingCandidate: topCandidate,
            stableForMs: topCandidate?.category === candidate?.category ? now - candidateSince : 0,
            coolingDownUntil
          };
        }

        coolingDownUntil = now + config.cooldownMs;
        activeReaction = null;
      }

      if (!topCandidate || now < coolingDownUntil) {
        candidate = null;
        candidateSince = 0;
        return {
          activeReaction: null,
          leadingCandidate: topCandidate,
          stableForMs: 0,
          coolingDownUntil
        };
      }

      if (candidate?.category !== topCandidate.category) {
        candidate = topCandidate;
        candidateSince = now;
      }

      const stableForMs = now - candidateSince;
      if (stableForMs >= config.stabilityMs) {
        activeReaction = {
          ...topCandidate,
          startedAt: now,
          heldUntil: now + config.holdMs
        };
      }

      return {
        activeReaction,
        leadingCandidate: topCandidate,
        stableForMs,
        coolingDownUntil
      };
    }
  };
}
