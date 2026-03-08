const PLAYER_KEY = "oa_player_name";
const scoreKey = (playerName: string) => `oa_high_score:${playerName}`;

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
let playerMemory = "Invitado";

export const getPlayerName = (): string => {
  if (!isStorageAvailable()) {
    return playerMemory;
  }

  const name = window.localStorage.getItem(PLAYER_KEY);
  return name?.trim() ? name : "Invitado";
};

export const setPlayerName = (name: string): string => {
  const safeName = name.trim() || "Invitado";

  if (!isStorageAvailable()) {
    playerMemory = safeName;
    return safeName;
  }

  window.localStorage.setItem(PLAYER_KEY, safeName);
  return safeName;
};

export const getHighScore = (playerName: string): number => {
  if (!isStorageAvailable()) {
    return scoreMemory.get(playerName) ?? 0;
  }

  const raw = window.localStorage.getItem(scoreKey(playerName));
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const setHighScore = (playerName: string, score: number): number => {
  const safeScore = Math.max(0, Math.floor(score));

  if (!isStorageAvailable()) {
    scoreMemory.set(playerName, safeScore);
    return safeScore;
  }

  window.localStorage.setItem(scoreKey(playerName), String(safeScore));
  return safeScore;
};
