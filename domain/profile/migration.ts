import { GameMode, SoundProfile } from "@/lib/game";
import {
  getOrCreateActiveProfileSnapshot,
  overwriteSnapshot,
} from "@/domain/profile/repository";
import { ProfileProgressSnapshot } from "@/domain/profile/types";

const MIGRATION_MARKER_KEY = "oa:v3:migrated_from_v2";

const canUseStorage = (): boolean => typeof window !== "undefined";

const getLegacy = (key: string): string | null => {
  if (!canUseStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setLegacy = (key: string, value: string) => {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures.
  }
};

const parseLegacyMode = (): GameMode => (getLegacy("oa_game_mode") === "hard" ? "hard" : "easy");
const parseLegacySound = (): SoundProfile => (getLegacy("oa_sound_profile") === "synth" ? "synth" : "piano");
const parseLegacyName = (): string => {
  const raw = getLegacy("oa_player_name")?.trim();
  return raw || "Invitado";
};

const parseLegacyScore = (playerName: string, mode: GameMode): number => {
  const raw = getLegacy(`oa_high_score:${playerName}:${mode}`);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const parseLegacyHardLevel = (): number => {
  const raw = getLegacy("oa_hard_level");
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(parsed, 5);
};

const hasAlreadyMigrated = (): boolean => getLegacy(MIGRATION_MARKER_KEY) === "1";

type MigratedStats = {
  scoreEasy: number;
  scoreHard: number;
  hardLevel: number;
};

const mergeLegacyProgress = (snapshot: ProfileProgressSnapshot, migrated: MigratedStats): ProfileProgressSnapshot => {
  const nextProgress = {
    ...snapshot.progress,
    unlockedLevel: Math.max(snapshot.progress.unlockedLevel, migrated.hardLevel),
    statsByMode: {
      ...snapshot.progress.statsByMode,
      easy: {
        ...snapshot.progress.statsByMode.easy,
        bestScore: Math.max(snapshot.progress.statsByMode.easy.bestScore, migrated.scoreEasy),
      },
      hard: {
        ...snapshot.progress.statsByMode.hard,
        bestScore: Math.max(snapshot.progress.statsByMode.hard.bestScore, migrated.scoreHard),
      },
    },
  };

  return {
    profile: snapshot.profile,
    progress: nextProgress,
  };
};

export const migrateLegacyStorageV2ToV3 = (): void => {
  if (!canUseStorage() || hasAlreadyMigrated()) {
    return;
  }

  const name = parseLegacyName();
  const mode = parseLegacyMode();
  const sound = parseLegacySound();
  const hardLevel = parseLegacyHardLevel();

  const baseSnapshot = getOrCreateActiveProfileSnapshot(name, mode, sound);
  const migrated = {
    scoreEasy: parseLegacyScore(name, "easy"),
    scoreHard: parseLegacyScore(name, "hard"),
    hardLevel,
  };

  const snapshotWithLegacy = mergeLegacyProgress(baseSnapshot, migrated);

  overwriteSnapshot({
    profile: {
      ...snapshotWithLegacy.profile,
      name,
      preferredMode: mode,
      preferredSound: sound,
      updatedAt: new Date().toISOString(),
    },
    progress: snapshotWithLegacy.progress,
  });

  setLegacy(MIGRATION_MARKER_KEY, "1");
};
