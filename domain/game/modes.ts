import { GameMode, NoteConfig, NoteId } from "@/lib/game";

export type PlayMode = "classic" | "memory-sequence" | "interval-guess";

export type RoundChallenge = {
  answerId: NoteId;
  playback: NoteId[];
  instruction: string;
};

export type ChallengeContext = {
  notes: NoteConfig[];
  difficulty: GameMode;
  level: number;
  previousAnswerId?: NoteId;
};

export type GameModeHandler = {
  id: PlayMode;
  label: string;
  hint: string;
  createChallenge: (ctx: ChallengeContext) => RoundChallenge;
};

const pickRandom = (notes: NoteConfig[], excludeId?: NoteId): NoteConfig => {
  const pool = excludeId ? notes.filter((note) => note.id !== excludeId) : notes;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
};

const classicHandler: GameModeHandler = {
  id: "classic",
  label: "Clasico",
  hint: "1 nota",
  createChallenge: ({ notes, previousAnswerId }) => {
    const answer = pickRandom(notes, previousAnswerId);
    return {
      answerId: answer.id,
      playback: [answer.id],
      instruction: "Escucha la nota y adivina cual es.",
    };
  },
};

const memoryHandler: GameModeHandler = {
  id: "memory-sequence",
  label: "Memoria",
  hint: "Secuencia",
  createChallenge: ({ notes, difficulty, level, previousAnswerId }) => {
    const sequenceLength = difficulty === "hard" ? Math.min(4, 2 + level) : 3;
    const playback: NoteId[] = [];

    for (let i = 0; i < sequenceLength; i += 1) {
      const previous = i === 0 ? previousAnswerId : playback[i - 1];
      playback.push(pickRandom(notes, previous).id);
    }

    return {
      answerId: playback[playback.length - 1],
      playback,
      instruction: "Escucha la secuencia y adivina la ultima nota.",
    };
  },
};

const intervalHandler: GameModeHandler = {
  id: "interval-guess",
  label: "Intervalos",
  hint: "2 notas",
  createChallenge: ({ notes, previousAnswerId }) => {
    const first = pickRandom(notes, previousAnswerId);
    const firstIndex = notes.findIndex((note) => note.id === first.id);

    const shifts = [-3, -2, -1, 1, 2, 3];
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const targetIndex = Math.min(Math.max(firstIndex + shift, 0), notes.length - 1);
    const second = notes[targetIndex] ?? first;

    return {
      answerId: second.id,
      playback: [first.id, second.id],
      instruction: "Escucha dos notas y adivina la segunda.",
    };
  },
};

const MODE_HANDLERS: Record<PlayMode, GameModeHandler> = {
  classic: classicHandler,
  "memory-sequence": memoryHandler,
  "interval-guess": intervalHandler,
};

export const PLAY_MODE_OPTIONS = Object.values(MODE_HANDLERS).map((mode) => ({
  id: mode.id,
  label: mode.label,
  hint: mode.hint,
}));

export const getModeHandler = (mode: PlayMode): GameModeHandler => {
  return MODE_HANDLERS[mode];
};
