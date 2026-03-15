import { PlayMode } from "@/domain/game/modes";
import { DEFAULT_MODE, DEFAULT_PLAYER_NAME, DEFAULT_SOUND_PROFILE, GameMode, SoundProfile } from "@/lib/game";
import { ModeStats, PlayerProfile, ProfileProgressSnapshot, ProgressState } from "@/domain/profile/types";

const ACTIVE_PROFILE_ID_KEY = "oa:v3:active_profile_id";
const PROFILE_KEY_PREFIX = "oa:v3:profile:";
const PROGRESS_KEY_PREFIX = "oa:v3:progress:";

const memoryStore = new Map<string, string>();

const hasWindow = () => typeof window !== "undefined";

const storageGet = (key: string): string | null => {
  if (!hasWindow()) {
    return memoryStore.get(key) ?? null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
};

const storageSet = (key: string, value: string): void => {
  memoryStore.set(key, value);

  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep memory fallback only.
  }
};

const profileKey = (id: string) => `${PROFILE_KEY_PREFIX}${id}`;
const progressKey = (id: string) => `${PROGRESS_KEY_PREFIX}${id}`;

const createId = (name: string): string => {
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "jugador";
  return `${safe}-${Date.now().toString(36)}`;
};

const nowIso = () => new Date().toISOString();

const emptyModeStats = (): ModeStats => ({
  games: 0,
  bestScore: 0,
  bestStreak: 0,
  accuracyAvg: 0,
  lastPlayedAt: null,
});

const createProgress = (playerId: string): ProgressState => ({
  playerId,
  unlockedLevel: 1,
  achievements: [],
  cosmeticsUnlocked: [],
  statsByMode: {
    easy: emptyModeStats(),
    hard: emptyModeStats(),
  },
});

const createProfile = (
  name = DEFAULT_PLAYER_NAME,
  preferredMode: GameMode = DEFAULT_MODE,
  preferredSound: SoundProfile = DEFAULT_SOUND_PROFILE,
  preferredPlayMode: PlayMode = "classic",
): PlayerProfile => {
  const timestamp = nowIso();
  return {
    id: createId(name),
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    preferredMode,
    preferredSound,
    preferredPlayMode,
  };
};

const readJson = <T>(key: string): T | null => {
  const raw = storageGet(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = <T>(key: string, value: T) => {
  storageSet(key, JSON.stringify(value));
};

const getActiveProfileId = (): string | null => storageGet(ACTIVE_PROFILE_ID_KEY);

const setActiveProfileId = (id: string) => {
  storageSet(ACTIVE_PROFILE_ID_KEY, id);
};

const ensureSnapshot = (
  name = DEFAULT_PLAYER_NAME,
  preferredMode: GameMode = DEFAULT_MODE,
  preferredSound: SoundProfile = DEFAULT_SOUND_PROFILE,
  preferredPlayMode: PlayMode = "classic",
): ProfileProgressSnapshot => {
  const activeId = getActiveProfileId();

  if (activeId) {
    const existingProfile = readJson<PlayerProfile>(profileKey(activeId));
    const existingProgress = readJson<ProgressState>(progressKey(activeId));

    if (existingProfile && existingProgress) {
      return { profile: existingProfile, progress: existingProgress };
    }
  }

  const profile = createProfile(name, preferredMode, preferredSound, preferredPlayMode);
  const progress = createProgress(profile.id);

  setActiveProfileId(profile.id);
  writeJson(profileKey(profile.id), profile);
  writeJson(progressKey(profile.id), progress);

  return { profile, progress };
};

export const getActiveProfileSnapshot = (): ProfileProgressSnapshot | null => {
  const activeId = getActiveProfileId();
  if (!activeId) {
    return null;
  }

  const profile = readJson<PlayerProfile>(profileKey(activeId));
  const progress = readJson<ProgressState>(progressKey(activeId));

  if (!profile || !progress) {
    return null;
  }

  return { profile, progress };
};

export const getOrCreateActiveProfileSnapshot = (
  name = DEFAULT_PLAYER_NAME,
  preferredMode: GameMode = DEFAULT_MODE,
  preferredSound: SoundProfile = DEFAULT_SOUND_PROFILE,
  preferredPlayMode: PlayMode = "classic",
): ProfileProgressSnapshot => ensureSnapshot(name, preferredMode, preferredSound, preferredPlayMode);

export const updateProfilePreferences = (updates: {
  name?: string;
  preferredMode?: GameMode;
  preferredSound?: SoundProfile;
  preferredPlayMode?: PlayMode;
}): ProfileProgressSnapshot => {
  const snapshot = ensureSnapshot();
  const nextProfile: PlayerProfile = {
    ...snapshot.profile,
    name: updates.name ?? snapshot.profile.name,
    preferredMode: updates.preferredMode ?? snapshot.profile.preferredMode,
    preferredSound: updates.preferredSound ?? snapshot.profile.preferredSound,
    preferredPlayMode: updates.preferredPlayMode ?? snapshot.profile.preferredPlayMode,
    updatedAt: nowIso(),
  };

  writeJson(profileKey(nextProfile.id), nextProfile);
  return { profile: nextProfile, progress: snapshot.progress };
};

export const upsertSessionBest = (mode: GameMode, score: number, streak: number, accuracy: number): ProgressState => {
  const snapshot = ensureSnapshot();
  const previousModeStats = snapshot.progress.statsByMode[mode];

  const nextModeStats: ModeStats = {
    games: previousModeStats.games,
    bestScore: Math.max(previousModeStats.bestScore, score),
    bestStreak: Math.max(previousModeStats.bestStreak, streak),
    accuracyAvg: Math.max(previousModeStats.accuracyAvg, accuracy),
    lastPlayedAt: nowIso(),
  };

  const nextProgress: ProgressState = {
    ...snapshot.progress,
    statsByMode: {
      ...snapshot.progress.statsByMode,
      [mode]: nextModeStats,
    },
  };

  writeJson(progressKey(snapshot.profile.id), nextProgress);
  return nextProgress;
};

export const recordCompletedMatch = (mode: GameMode, finalAccuracy: number): ProgressState => {
  const snapshot = ensureSnapshot();
  const previousModeStats = snapshot.progress.statsByMode[mode];
  const games = previousModeStats.games + 1;
  const accuracyAvg = Math.round(((previousModeStats.accuracyAvg * previousModeStats.games + finalAccuracy) / games) * 100) / 100;

  const nextProgress: ProgressState = {
    ...snapshot.progress,
    statsByMode: {
      ...snapshot.progress.statsByMode,
      [mode]: {
        ...previousModeStats,
        games,
        accuracyAvg,
        lastPlayedAt: nowIso(),
      },
    },
  };

  writeJson(progressKey(snapshot.profile.id), nextProgress);
  return nextProgress;
};

export const updateUnlockedLevel = (level: number): ProgressState => {
  const snapshot = ensureSnapshot();
  const nextProgress: ProgressState = {
    ...snapshot.progress,
    unlockedLevel: Math.max(snapshot.progress.unlockedLevel, Math.min(Math.max(level, 1), 5)),
  };

  writeJson(progressKey(snapshot.profile.id), nextProgress);
  return nextProgress;
};

export const overwriteSnapshot = (snapshot: ProfileProgressSnapshot): void => {
  setActiveProfileId(snapshot.profile.id);
  writeJson(profileKey(snapshot.profile.id), snapshot.profile);
  writeJson(progressKey(snapshot.profile.id), snapshot.progress);
};
