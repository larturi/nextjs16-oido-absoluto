import { describe, expect, it } from "vitest";
import { getModeHandler } from "@/domain/game/modes";
import { getNotesForMode } from "@/lib/game";

describe("modos de juego", () => {
  it("modo clasico crea una sola nota para reproducir", () => {
    const handler = getModeHandler("classic");
    const notes = getNotesForMode("easy");

    const challenge = handler.createChallenge({
      notes,
      difficulty: "easy",
      level: 1,
    });

    expect(challenge.playback.length).toBe(1);
    expect(challenge.answerId).toBe(challenge.playback[0]);
  });

  it("modo memoria usa una secuencia y la respuesta es la ultima nota", () => {
    const handler = getModeHandler("memory-sequence");
    const notes = getNotesForMode("hard");

    const challenge = handler.createChallenge({
      notes,
      difficulty: "hard",
      level: 3,
    });

    expect(challenge.playback.length).toBeGreaterThanOrEqual(3);
    expect(challenge.answerId).toBe(challenge.playback[challenge.playback.length - 1]);
  });

  it("modo intervalos reproduce dos notas y responde la segunda", () => {
    const handler = getModeHandler("interval-guess");
    const notes = getNotesForMode("easy");

    const challenge = handler.createChallenge({
      notes,
      difficulty: "easy",
      level: 1,
    });

    expect(challenge.playback.length).toBe(2);
    expect(challenge.answerId).toBe(challenge.playback[1]);
  });
});
