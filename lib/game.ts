export type GameMode = "easy" | "hard";

export type NoteId =
  | "do"
  | "doSharp"
  | "re"
  | "reSharp"
  | "mi"
  | "fa"
  | "faSharp"
  | "sol"
  | "solSharp"
  | "la"
  | "laSharp"
  | "si";

export type RoundResult = "correct" | "wrong" | "idle";

export type NoteConfig = {
  id: NoteId;
  label: string;
  audioSrc: string;
};

export type GameModeOption = {
  id: GameMode;
  label: string;
  hint: string;
};

const ALL_NOTES: NoteConfig[] = [
  { id: "do", label: "Do", audioSrc: "/audio/notes/do.wav" },
  { id: "doSharp", label: "Do#", audioSrc: "/audio/notes/do-sharp.wav" },
  { id: "re", label: "Re", audioSrc: "/audio/notes/re.wav" },
  { id: "reSharp", label: "Re#", audioSrc: "/audio/notes/re-sharp.wav" },
  { id: "mi", label: "Mi", audioSrc: "/audio/notes/mi.wav" },
  { id: "fa", label: "Fa", audioSrc: "/audio/notes/fa.wav" },
  { id: "faSharp", label: "Fa#", audioSrc: "/audio/notes/fa-sharp.wav" },
  { id: "sol", label: "Sol", audioSrc: "/audio/notes/sol.wav" },
  { id: "solSharp", label: "Sol#", audioSrc: "/audio/notes/sol-sharp.wav" },
  { id: "la", label: "La", audioSrc: "/audio/notes/la.wav" },
  { id: "laSharp", label: "La#", audioSrc: "/audio/notes/la-sharp.wav" },
  { id: "si", label: "Si", audioSrc: "/audio/notes/si.wav" },
];

const EASY_NOTE_IDS: NoteId[] = ["do", "re", "mi", "fa", "sol", "la", "si"];

export const DEFAULT_PLAYER_NAME = "Invitado";
export const DEFAULT_MODE: GameMode = "easy";

export const MODE_OPTIONS: GameModeOption[] = [
  { id: "easy", label: "Normal", hint: "Notas naturales" },
  { id: "hard", label: "Dificil", hint: "Incluye sostenidos" },
];

export const getNotesForMode = (mode: GameMode): NoteConfig[] => {
  if (mode === "hard") {
    return ALL_NOTES;
  }

  return ALL_NOTES.filter((note) => EASY_NOTE_IDS.includes(note.id));
};

export const pickRandomNote = (notes: NoteConfig[], excludeId?: NoteId): NoteConfig => {
  const pool = excludeId ? notes.filter((note) => note.id !== excludeId) : notes;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
};

export const resolveRound = (expected: NoteId, guess: NoteId): RoundResult => {
  return expected === guess ? "correct" : "wrong";
};

export const feedbackText = (result: RoundResult, answer: NoteConfig | null): string => {
  if (!answer || result === "idle") {
    return "Escucha una nota y elige tu respuesta.";
  }

  if (result === "correct") {
    return `Bien! Era ${answer.label}. Sumaste 1 punto.`;
  }

  return `Casi! Era ${answer.label}. Proba con la siguiente.`;
};
