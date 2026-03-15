import { describe, expect, it } from "vitest";
import {
  beginRound,
  computeMultiplier,
  createMatchState,
  scoreAnswer,
  shouldAdvanceLevel,
} from "@/domain/game/engine";

describe("calcular multiplicador", () => {
  it("mantiene multiplicador en 1 para combo bajo", () => {
    expect(computeMultiplier(0)).toBe(1);
    expect(computeMultiplier(2)).toBe(1);
  });

  it("aumenta multiplicador cada 3 de combo y limita en 4", () => {
    expect(computeMultiplier(3)).toBe(2);
    expect(computeMultiplier(6)).toBe(3);
    expect(computeMultiplier(9)).toBe(4);
    expect(computeMultiplier(30)).toBe(4);
  });
});

describe("puntuar respuesta", () => {
  it("suma puntos y actualiza combo cuando la respuesta es correcta", () => {
    const idle = createMatchState(1, 3);
    const round = beginRound(idle, "do");

    const first = scoreAnswer(round, "do");
    expect(first.wasCorrect).toBe(true);
    expect(first.pointsGained).toBe(1);
    expect(first.next.score).toBe(1);
    expect(first.next.combo).toBe(1);
    expect(first.next.multiplier).toBe(1);

    const secondRound = beginRound(first.next, "re");
    const second = scoreAnswer(secondRound, "re");
    const thirdRound = beginRound(second.next, "mi");
    const third = scoreAnswer(thirdRound, "mi");

    expect(third.next.combo).toBe(3);
    expect(third.next.multiplier).toBe(2);
    expect(third.pointsGained).toBe(2);
  });

  it("quita una vida y reinicia combo en respuesta incorrecta", () => {
    const active = {
      ...createMatchState(1, 3),
      status: "active" as const,
      currentNoteId: "fa" as const,
      hasPlayedRound: true,
      combo: 5,
      multiplier: 2,
      streak: 5,
    };

    const result = scoreAnswer(active, "sol");

    expect(result.wasCorrect).toBe(false);
    expect(result.next.lives).toBe(2);
    expect(result.next.combo).toBe(0);
    expect(result.next.multiplier).toBe(1);
    expect(result.next.streak).toBe(0);
    expect(result.next.status).toBe("active");
  });

  it("termina la partida cuando las vidas llegan a cero", () => {
    const active = {
      ...createMatchState(1, 1),
      status: "active" as const,
      currentNoteId: "la" as const,
      hasPlayedRound: true,
    };

    const result = scoreAnswer(active, "si");
    expect(result.next.lives).toBe(0);
    expect(result.next.status).toBe("over");
  });
});

describe("avance de nivel", () => {
  it("avanza cuando el puntaje llega al objetivo", () => {
    expect(shouldAdvanceLevel(1, 8)).toBe(true);
    expect(shouldAdvanceLevel(2, 16)).toBe(true);
  });

  it("no avanza cuando el puntaje es menor al objetivo o ya esta en nivel maximo", () => {
    expect(shouldAdvanceLevel(1, 7)).toBe(false);
    expect(shouldAdvanceLevel(5, 999)).toBe(false);
  });
});
