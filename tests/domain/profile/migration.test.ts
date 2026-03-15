/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";

const loadModules = async () => {
  vi.resetModules();
  const migration = await import("@/domain/profile/migration");
  const repo = await import("@/domain/profile/repository");
  return { migration, repo };
};

describe("migracion legacy v2 -> v3", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  it("migra nombre, preferencias, score y nivel hard", async () => {
    window.localStorage.setItem("oa_player_name", "Lola");
    window.localStorage.setItem("oa_game_mode", "hard");
    window.localStorage.setItem("oa_sound_profile", "synth");
    window.localStorage.setItem("oa_high_score:Lola:easy", "11");
    window.localStorage.setItem("oa_high_score:Lola:hard", "19");
    window.localStorage.setItem("oa_hard_level", "3");

    const { migration, repo } = await loadModules();
    migration.migrateLegacyStorageV2ToV3();

    const snapshot = repo.getOrCreateActiveProfileSnapshot();
    expect(snapshot.profile.name).toBe("Lola");
    expect(snapshot.profile.preferredMode).toBe("hard");
    expect(snapshot.profile.preferredSound).toBe("synth");
    expect(snapshot.progress.statsByMode.easy.bestScore).toBe(11);
    expect(snapshot.progress.statsByMode.hard.bestScore).toBe(19);
    expect(snapshot.progress.unlockedLevel).toBe(3);
    expect(window.localStorage.getItem("oa:v3:migrated_from_v2")).toBe("1");
  });
});
