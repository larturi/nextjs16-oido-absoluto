export type NoteId = "do" | "re" | "mi" | "fa" | "sol" | "la" | "si";
export type RoundResult = "correct" | "wrong" | "idle";

export type NoteConfig = {
  id: NoteId;
  label: string;
  audioSrc: string;
};

export const NOTES: NoteConfig[] = [
  { id: "do", label: "Do", audioSrc: "/audio/notes/do.wav" },
  { id: "re", label: "Re", audioSrc: "/audio/notes/re.wav" },
  { id: "mi", label: "Mi", audioSrc: "/audio/notes/mi.wav" },
  { id: "fa", label: "Fa", audioSrc: "/audio/notes/fa.wav" },
  { id: "sol", label: "Sol", audioSrc: "/audio/notes/sol.wav" },
  { id: "la", label: "La", audioSrc: "/audio/notes/la.wav" },
  { id: "si", label: "Si", audioSrc: "/audio/notes/si.wav" },
];

export const DEFAULT_PLAYER_NAME = "Invitado";

export const pickRandomNote = (exclude?: NoteId): NoteConfig => {
  const pool = exclude ? NOTES.filter((note) => note.id !== exclude) : NOTES;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
};

export const resolveRound = (expected: NoteId, guess: NoteId): RoundResult => {
  return expected === guess ? "correct" : "wrong";
};
