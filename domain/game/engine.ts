import { resolveRound } from "@/lib/game";
import { AnswerOutcome, MatchState } from "@/domain/game/types";

const BASE_MULTIPLIER = 1;
const COMBO_STEP = 3;
const MAX_MULTIPLIER = 4;

export const LEVEL_TARGET_SCORE: Record<number, number> = {
  1: 8,
  2: 16,
  3: 26,
  4: 38,
  5: 52,
};

export const MAX_LEVEL = 5;

export const computeMultiplier = (combo: number): number => {
  const growth = Math.floor(combo / COMBO_STEP);
  return Math.min(BASE_MULTIPLIER + growth, MAX_MULTIPLIER);
};

export const createMatchState = (level: number, lives: number): MatchState => ({
  status: "idle",
  level,
  lives,
  combo: 0,
  multiplier: BASE_MULTIPLIER,
  score: 0,
  attempts: 0,
  streak: 0,
  lastResult: "idle",
  currentNoteId: null,
  hasPlayedRound: false,
  isAnswered: false,
});

export const beginRound = (state: MatchState, noteId: MatchState["currentNoteId"]): MatchState => ({
  ...state,
  status: "active",
  currentNoteId: noteId,
  lastResult: "idle",
  isAnswered: false,
  hasPlayedRound: true,
});

export const scoreAnswer = (state: MatchState, guess: NonNullable<MatchState["currentNoteId"]>): AnswerOutcome => {
  if (!state.currentNoteId || state.isAnswered || state.status === "over") {
    return { next: state, wasCorrect: false, pointsGained: 0 };
  }

  const result = resolveRound(state.currentNoteId, guess);
  const nextAttempts = state.attempts + 1;

  if (result === "correct") {
    const nextCombo = state.combo + 1;
    const nextMultiplier = computeMultiplier(nextCombo);
    const pointsGained = nextMultiplier;

    return {
      wasCorrect: true,
      pointsGained,
      next: {
        ...state,
        status: "active",
        attempts: nextAttempts,
        combo: nextCombo,
        multiplier: nextMultiplier,
        score: state.score + pointsGained,
        streak: state.streak + 1,
        lastResult: "correct",
        isAnswered: true,
      },
    };
  }

  const nextLives = Math.max(0, state.lives - 1);
  return {
    wasCorrect: false,
    pointsGained: 0,
    next: {
      ...state,
      status: nextLives === 0 ? "over" : "active",
      attempts: nextAttempts,
      lives: nextLives,
      combo: 0,
      multiplier: BASE_MULTIPLIER,
      streak: 0,
      lastResult: "wrong",
      isAnswered: true,
    },
  };
};

export const shouldAdvanceLevel = (level: number, score: number): boolean => {
  if (level >= MAX_LEVEL) {
    return false;
  }

  const target = LEVEL_TARGET_SCORE[level] ?? Number.POSITIVE_INFINITY;
  return score >= target;
};
