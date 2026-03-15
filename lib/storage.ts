import { DEFAULT_MODE, DEFAULT_PLAYER_NAME, DEFAULT_SOUND_PROFILE, GameMode, SoundProfile } from "@/lib/game";

const PLAYER_KEY = "oa_player_name";
const MODE_KEY = "oa_game_mode";
const SOUND_PROFILE_KEY = "oa_sound_profile";
const HARD_LEVEL_KEY = "oa_hard_level";

const scoreKey = (playerName: string, mode: GameMode) => `oa_high_score:${playerName}:${mode}`;

const isStorageAvailable = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const testKey = "__oa_test_key";
    window.localStorage.setItem(testKey, "ok");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const scoreMemory = new Map<string, number>();
let playerMemory = DEFAULT_PLAYER_NAME;
let modeMemory: GameMode = DEFAULT_MODE;
let soundProfileMemory: SoundProfile = DEFAULT_SOUND_PROFILE;
let hardLevelMemory = 1;

export const getPlayerName = (): string => {
  if (!isStorageAvailable()) {
    return playerMemory;
  }

  const name = window.localStorage.getItem(PLAYER_KEY);
  return name?.trim() ? name : DEFAULT_PLAYER_NAME;
};

export const setPlayerName = (name: string): string => {
  const safeName = name.trim() || DEFAULT_PLAYER_NAME;

  if (!isStorageAvailable()) {
    playerMemory = safeName;
    return safeName;
  }

  window.localStorage.setItem(PLAYER_KEY, safeName);
  return safeName;
};

export const getGameMode = (): GameMode => {
  if (!isStorageAvailable()) {
    return modeMemory;
  }

  const mode = window.localStorage.getItem(MODE_KEY);
  return mode === "hard" ? "hard" : "easy";
};

export const setGameMode = (mode: GameMode): GameMode => {
  if (!isStorageAvailable()) {
    modeMemory = mode;
    return mode;
  }

  window.localStorage.setItem(MODE_KEY, mode);
  return mode;
};

export const getSoundProfile = (): SoundProfile => {
  if (!isStorageAvailable()) {
    return soundProfileMemory;
  }

  const soundProfile = window.localStorage.getItem(SOUND_PROFILE_KEY);
  return soundProfile === "synth" ? "synth" : "piano";
};

export const setSoundProfile = (soundProfile: SoundProfile): SoundProfile => {
  if (!isStorageAvailable()) {
    soundProfileMemory = soundProfile;
    return soundProfile;
  }

  window.localStorage.setItem(SOUND_PROFILE_KEY, soundProfile);
  return soundProfile;
};

export const getHardLevel = (): number => {
  if (!isStorageAvailable()) {
    return hardLevelMemory;
  }

  const raw = window.localStorage.getItem(HARD_LEVEL_KEY);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(parsed, 5);
};

export const setHardLevel = (level: number): number => {
  const safeLevel = Number.isInteger(level) ? Math.min(Math.max(level, 1), 5) : 1;

  if (!isStorageAvailable()) {
    hardLevelMemory = safeLevel;
    return safeLevel;
  }

  window.localStorage.setItem(HARD_LEVEL_KEY, String(safeLevel));
  return safeLevel;
};

export const getHighScore = (playerName: string, mode: GameMode): number => {
  const key = scoreKey(playerName, mode);

  if (!isStorageAvailable()) {
    return scoreMemory.get(key) ?? 0;
  }

  const raw = window.localStorage.getItem(key);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const setHighScore = (playerName: string, mode: GameMode, score: number): number => {
  const safeScore = Math.max(0, Math.floor(score));
  const key = scoreKey(playerName, mode);

  if (!isStorageAvailable()) {
    scoreMemory.set(key, safeScore);
    return safeScore;
  }

  window.localStorage.setItem(key, String(safeScore));
  return safeScore;
};
