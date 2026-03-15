import { getNotesForMode, GameMode, NoteConfig } from "@/lib/game";

const HARD_SHARP_ORDER = ["faSharp", "doSharp", "solSharp", "reSharp", "laSharp"] as const;

export const clampHardLevel = (level: number): number => {
  if (level < 1) {
    return 1;
  }

  if (level > 5) {
    return 5;
  }

  return level;
};

export const getNotePoolForLevel = (mode: GameMode, level: number): NoteConfig[] => {
  if (mode !== "hard") {
    return getNotesForMode("easy");
  }

  const allHard = getNotesForMode("hard");
  const natural = allHard.filter((n) => !n.id.includes("Sharp"));
  const allowedSharps = HARD_SHARP_ORDER.slice(0, clampHardLevel(level));
  const sharps = allHard.filter((n) => allowedSharps.includes(n.id as (typeof HARD_SHARP_ORDER)[number]));

  return [...natural, ...sharps];
};
