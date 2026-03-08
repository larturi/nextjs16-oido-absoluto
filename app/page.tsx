"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PLAYER_NAME,
  NOTES,
  NoteConfig,
  NoteId,
  RoundResult,
  pickRandomNote,
  resolveRound,
} from "@/lib/game";
import { getHighScore, getPlayerName, setHighScore, setPlayerName } from "@/lib/storage";

type AudioBank = {
  notes: Map<NoteId, HTMLAudioElement>;
  correct: HTMLAudioElement;
  wrong: HTMLAudioElement;
};

const PRELOAD = "auto";

const createAudioBank = (): AudioBank => {
  const notes = new Map<NoteId, HTMLAudioElement>();

  for (const note of NOTES) {
    const audio = new Audio(note.audioSrc);
    audio.preload = PRELOAD;
    notes.set(note.id, audio);
  }

  const correct = new Audio("/audio/sfx/correct.wav");
  correct.preload = PRELOAD;

  const wrong = new Audio("/audio/sfx/wrong.wav");
  wrong.preload = PRELOAD;

  return { notes, correct, wrong };
};

const feedbackText = (result: RoundResult, answer: NoteConfig | null): string => {
  if (!answer || result === "idle") {
    return "Escucha una nota y elige tu respuesta.";
  }

  if (result === "correct") {
    return `Bien! Era ${answer.label}. Sumaste 1 punto.`;
  }

  return `Casi! Era ${answer.label}. Proba de nuevo con la siguiente.`;
};

export default function HomePage() {
  const audioBankRef = useRef<AudioBank | null>(null);
  const [playerName, setPlayerNameState] = useState(DEFAULT_PLAYER_NAME);
  const [nameDraft, setNameDraft] = useState(DEFAULT_PLAYER_NAME);
  const [highScore, setHighScoreState] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastResult, setLastResult] = useState<RoundResult>("idle");
  const [currentNote, setCurrentNote] = useState<NoteConfig | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [hasPlayedRound, setHasPlayedRound] = useState(false);

  useEffect(() => {
    const loadedName = getPlayerName();
    setPlayerNameState(loadedName);
    setNameDraft(loadedName);
    setHighScoreState(getHighScore(loadedName));
  }, []);

  useEffect(() => {
    audioBankRef.current = createAudioBank();
    return () => {
      audioBankRef.current = null;
    };
  }, []);

  const playNote = useCallback(async (noteId: NoteId) => {
    const bank = audioBankRef.current;
    if (!bank) {
      return;
    }

    const audio = bank.notes.get(noteId);
    if (!audio) {
      return;
    }

    audio.currentTime = 0;
    try {
      await audio.play();
    } catch {
      // Ignore browser autoplay restrictions; user can retry with another click.
    }
  }, []);

  const playSfx = useCallback(async (result: RoundResult) => {
    const bank = audioBankRef.current;
    if (!bank || result === "idle") {
      return;
    }

    const audio = result === "correct" ? bank.correct : bank.wrong;
    audio.currentTime = 0;

    try {
      await audio.play();
    } catch {
      // Ignore playback errors to keep game flow responsive.
    }
  }, []);

  const startRound = useCallback(async () => {
    if (currentNote && !isAnswered) {
      await playNote(currentNote.id);
      return;
    }

    const next = pickRandomNote(currentNote?.id);
    setCurrentNote(next);
    setLastResult("idle");
    setIsAnswered(false);
    setHasPlayedRound(true);
    await playNote(next.id);
  }, [currentNote, isAnswered, playNote]);

  const submitGuess = useCallback(
    async (guess: NoteId) => {
      if (!currentNote || !hasPlayedRound || isAnswered) {
        return;
      }

      const result = resolveRound(currentNote.id, guess);
      setLastResult(result);
      setIsAnswered(true);
      setAttempts((prev) => prev + 1);

      if (result === "correct") {
        setScore((prev) => {
          const nextScore = prev + 1;
          if (nextScore > highScore) {
            setHighScore(playerName, nextScore);
            setHighScoreState(nextScore);
          }
          return nextScore;
        });
        setStreak((prev) => prev + 1);
      } else {
        setStreak(0);
      }

      await playSfx(result);
    },
    [currentNote, hasPlayedRound, highScore, isAnswered, playSfx, playerName],
  );

  const savePlayer = useCallback(() => {
    const safeName = setPlayerName(nameDraft);
    setPlayerNameState(safeName);
    setNameDraft(safeName);
    setHighScoreState(getHighScore(safeName));
  }, [nameDraft]);

  const accuracy = useMemo(() => {
    if (attempts === 0) {
      return 0;
    }

    return Math.round((score / attempts) * 100);
  }, [attempts, score]);

  const feedback = feedbackText(lastResult, currentNote);
  const listenLabel = !currentNote ? "Escuchar nota" : isAnswered ? "Siguiente nota" : "Repetir nota";

  return (
    <main className="arcade-shell">
      <section className="hud-card">
        <div>
          <p className="overline">Oido Absoluto Arcade</p>
          <h1>Entrena jugando con notas musicales</h1>
        </div>

        <label className="player-input" htmlFor="playerName">
          Jugador
          <div>
            <input
              id="playerName"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={savePlayer}
              maxLength={24}
            />
            <button className="player-save" type="button" onClick={savePlayer}>
              Guardar
            </button>
          </div>
        </label>

        <div className="stats-grid">
          <article>
            <span>Puntos</span>
            <strong>{score}</strong>
          </article>
          <article>
            <span>Racha</span>
            <strong>{streak}</strong>
          </article>
          <article>
            <span>Precision</span>
            <strong>{accuracy}%</strong>
          </article>
          <article>
            <span>Record de {playerName}</span>
            <strong>{highScore}</strong>
          </article>
        </div>
      </section>

      <section className="game-card" aria-live="polite">
        <div className="round-actions">
          <button className="cta" type="button" onClick={startRound}>
            {listenLabel}
          </button>

          <button
            className="ghost"
            type="button"
            onClick={() => {
              setScore(0);
              setAttempts(0);
              setStreak(0);
              setLastResult("idle");
              setCurrentNote(null);
              setIsAnswered(false);
              setHasPlayedRound(false);
            }}
          >
            Reiniciar puntaje
          </button>
        </div>

        <p className={`feedback ${lastResult}`}>{feedback}</p>

        <div className="pads-grid" role="group" aria-label="Botones de notas">
          {NOTES.map((note) => (
            <button
              key={note.id}
              type="button"
              className="note-pad"
              onClick={() => submitGuess(note.id)}
              disabled={!hasPlayedRound || isAnswered}
            >
              {note.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
