import { PlayMode } from "@/domain/game/modes";
import { GameMode, SoundProfile } from "@/lib/game";

export type PlayerProfile = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  preferredMode: GameMode;
  preferredSound: SoundProfile;
  preferredPlayMode: PlayMode;
};

export type ModeStats = {
  games: number;
  bestScore: number;
  bestStreak: number;
  accuracyAvg: number;
  lastPlayedAt: string | null;
};

export type ProgressState = {
  playerId: string;
  unlockedLevel: number;
  achievements: string[];
  cosmeticsUnlocked: string[];
  statsByMode: Record<GameMode, ModeStats>;
};

export type ProfileProgressSnapshot = {
  profile: PlayerProfile;
  progress: ProgressState;
};
