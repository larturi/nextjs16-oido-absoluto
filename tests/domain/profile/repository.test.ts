import { beforeEach, describe, expect, it, vi } from "vitest";

const loadRepo = async () => {
  vi.resetModules();
  return import("@/domain/profile/repository");
};

describe("repositorio de perfil v3", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("crea snapshot activo por defecto", async () => {
    const repo = await loadRepo();
    const snapshot = repo.getOrCreateActiveProfileSnapshot();

    expect(snapshot.profile.name).toBe("Invitado");
    expect(snapshot.profile.preferredMode).toBe("easy");
    expect(snapshot.progress.unlockedLevel).toBe(1);
    expect(snapshot.progress.statsByMode.easy.bestScore).toBe(0);
    expect(snapshot.progress.statsByMode.hard.bestScore).toBe(0);
  });

  it("actualiza preferencias del perfil", async () => {
    const repo = await loadRepo();
    repo.getOrCreateActiveProfileSnapshot();

    const updated = repo.updateProfilePreferences({
      name: "Lola",
      preferredMode: "hard",
      preferredSound: "synth",
    });

    expect(updated.profile.name).toBe("Lola");
    expect(updated.profile.preferredMode).toBe("hard");
    expect(updated.profile.preferredSound).toBe("synth");
  });

  it("guarda mejor score/racha y acumula partidas", async () => {
    const repo = await loadRepo();
    repo.getOrCreateActiveProfileSnapshot("Lola", "easy", "piano");

    const session = repo.upsertSessionBest("easy", 12, 4, 80);
    expect(session.statsByMode.easy.bestScore).toBe(12);
    expect(session.statsByMode.easy.bestStreak).toBe(4);

    const completed = repo.recordCompletedMatch("easy", 75);
    expect(completed.statsByMode.easy.games).toBe(1);
    expect(completed.statsByMode.easy.accuracyAvg).toBe(75);
  });

  it("actualiza nivel desbloqueado sin bajar nivel", async () => {
    const repo = await loadRepo();
    repo.getOrCreateActiveProfileSnapshot();

    const level4 = repo.updateUnlockedLevel(4);
    expect(level4.unlockedLevel).toBe(4);

    const level2 = repo.updateUnlockedLevel(2);
    expect(level2.unlockedLevel).toBe(4);
  });
});
