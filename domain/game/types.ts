import { NoteId, RoundResult } from "@/lib/game";

export type MatchStatus = "idle" | "active" | "over";

export type MatchState = {
  status: MatchStatus;
  level: number;
  lives: number;
  combo: number;
  multiplier: number;
  score: number;
  attempts: number;
  streak: number;
  lastResult: RoundResult;
  currentNoteId: NoteId | null;
  hasPlayedRound: boolean;
  isAnswered: boolean;
};

export type AnswerOutcome = {
  next: MatchState;
  wasCorrect: boolean;
  pointsGained: number;
};
