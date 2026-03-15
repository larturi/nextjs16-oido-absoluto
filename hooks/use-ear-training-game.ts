"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { beginRound, createMatchState, LEVEL_TARGET_SCORE, scoreAnswer, shouldAdvanceLevel } from "@/domain/game/engine";
import { getNotePoolForLevel } from "@/domain/game/progression";
import {
  DEFAULT_MODE,
  DEFAULT_PLAYER_NAME,
  DEFAULT_SOUND_PROFILE,
  getAudioSrcForNote,
  GameMode,
  MODE_OPTIONS,
  NoteConfig,
  NoteId,
  pickRandomNote,
  SOUND_PROFILE_OPTIONS,
  SoundProfile,
} from "@/lib/game";
import {
  getGameMode,
  getHardLevel,
  getHighScore,
  getPlayerName,
  getSoundProfile,
  setGameMode,
  setHardLevel,
  setHighScore,
  setPlayerName,
  setSoundProfile,
} from "@/lib/storage";

type AudioBank = {
  notes: Map<NoteId, HTMLAudioElement>;
  correct: HTMLAudioElement;
  wrong: HTMLAudioElement;
};

const PRELOAD = "auto";
const INITIAL_LIVES = 3;

const buildAudioBank = (notes: NoteConfig[], soundProfile: SoundProfile): AudioBank => {
  const noteMap = new Map<NoteId, HTMLAudioElement>();

  for (const note of notes) {
    const audio = new Audio(getAudioSrcForNote(note, soundProfile));
    audio.preload = PRELOAD;
    noteMap.set(note.id, audio);
  }

  const correct = new Audio("/audio/sfx/correct.wav");
  correct.preload = PRELOAD;

  const wrong = new Audio("/audio/sfx/wrong.wav");
  wrong.preload = PRELOAD;

  return { notes: noteMap, correct, wrong };
};

export const useEarTrainingGame = () => {
  const [playerName, setPlayerNameState] = useState(DEFAULT_PLAYER_NAME);
  const [nameDraft, setNameDraft] = useState(DEFAULT_PLAYER_NAME);
  const [mode, setMode] = useState<GameMode>(DEFAULT_MODE);
  const [soundProfile, setSoundProfileState] = useState<SoundProfile>(DEFAULT_SOUND_PROFILE);
  const [highScore, setHighScoreState] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [match, setMatch] = useState(() => createMatchState(1, INITIAL_LIVES));

  const notes = useMemo(() => getNotePoolForLevel(mode, match.level), [mode, match.level]);
  const noteMap = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const currentNote = match.currentNoteId ? noteMap.get(match.currentNoteId) ?? null : null;

  const audioBankRef = useRef<AudioBank | null>(null);

  useEffect(() => {
    const loadedName = getPlayerName();
    const loadedMode = getGameMode();
    const loadedSoundProfile = getSoundProfile();
    const loadedLevel = loadedMode === "hard" ? getHardLevel() : 1;

    setPlayerNameState(loadedName);
    setNameDraft(loadedName);
    setMode(loadedMode);
    setSoundProfileState(loadedSoundProfile);
    setHighScoreState(getHighScore(loadedName, loadedMode));
    setMatch(createMatchState(loadedLevel, INITIAL_LIVES));
  }, []);

  useEffect(() => {
    audioBankRef.current = buildAudioBank(notes, soundProfile);
    return () => {
      audioBankRef.current = null;
    };
  }, [notes, soundProfile]);

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
      // Ignore autoplay restrictions to keep UX responsive.
    }
  }, []);

  const playSfx = useCallback(async (result: "correct" | "wrong") => {
    const bank = audioBankRef.current;
    if (!bank) {
      return;
    }

    const audio = result === "correct" ? bank.correct : bank.wrong;
    audio.currentTime = 0;

    try {
      await audio.play();
    } catch {
      // Ignore playback errors to preserve game flow.
    }
  }, []);

  const resetMatch = useCallback(
    (level?: number) => {
      const nextLevel = level ?? (mode === "hard" ? getHardLevel() : 1);
      setMatch(createMatchState(nextLevel, INITIAL_LIVES));
      setStatusMessage(null);
    },
    [mode],
  );

  const resetScore = useCallback(() => {
    resetMatch(mode === "hard" ? match.level : 1);
  }, [match.level, mode, resetMatch]);

  const playOrNext = useCallback(async () => {
    setStatusMessage(null);

    if (match.status === "over") {
      resetMatch(mode === "hard" ? match.level : 1);
      return;
    }

    if (match.currentNoteId && !match.isAnswered) {
      await playNote(match.currentNoteId);
      return;
    }

    const next = pickRandomNote(notes, match.currentNoteId ?? undefined);
    setMatch((prev) => beginRound(prev, next.id));
    await playNote(next.id);
  }, [match, mode, notes, playNote, resetMatch]);

  const submitGuess = useCallback(
    async (guess: NoteId) => {
      if (!match.currentNoteId || !match.hasPlayedRound || match.isAnswered || match.status === "over") {
        return;
      }

      const outcome = scoreAnswer(match, guess);
      let nextState = outcome.next;

      if (outcome.wasCorrect && mode === "hard" && shouldAdvanceLevel(nextState.level, nextState.score)) {
        const nextLevel = Math.min(nextState.level + 1, 5);
        setHardLevel(nextLevel);
        nextState = {
          ...nextState,
          level: nextLevel,
          combo: 0,
          multiplier: 1,
        };
        setStatusMessage(`Nivel ${nextLevel} desbloqueado!`);
      }

      if (nextState.score > highScore) {
        setHighScore(playerName, mode, nextState.score);
        setHighScoreState(nextState.score);
      }

      setMatch(nextState);
      await playSfx(outcome.wasCorrect ? "correct" : "wrong");
    },
    [highScore, match, mode, playSfx, playerName],
  );

  const savePlayer = useCallback(() => {
    const safeName = setPlayerName(nameDraft);
    setPlayerNameState(safeName);
    setNameDraft(safeName);
    setHighScoreState(getHighScore(safeName, mode));
  }, [mode, nameDraft]);

  const changeMode = useCallback(
    (nextMode: GameMode) => {
      if (nextMode === mode) {
        return;
      }

      const persistedMode = setGameMode(nextMode);
      const nextLevel = persistedMode === "hard" ? getHardLevel() : 1;

      setMode(persistedMode);
      setHighScoreState(getHighScore(playerName, persistedMode));
      setMatch(createMatchState(nextLevel, INITIAL_LIVES));
      setStatusMessage(null);
    },
    [mode, playerName],
  );

  const changeSoundProfile = useCallback(
    (nextSoundProfile: SoundProfile) => {
      if (nextSoundProfile === soundProfile) {
        return;
      }

      setSoundProfileState(setSoundProfile(nextSoundProfile));
    },
    [soundProfile],
  );

  const accuracy = useMemo(() => {
    if (match.attempts === 0) {
      return 0;
    }

    return Math.round((match.score / match.attempts) * 100);
  }, [match.attempts, match.score]);

  const listenLabel =
    match.status === "over"
      ? "Nueva partida"
      : !match.currentNoteId
        ? "Escuchar nota"
        : match.isAnswered
          ? "Siguiente nota"
          : "Repetir nota";

  const feedback = (() => {
    if (statusMessage) {
      return statusMessage;
    }

    if (match.status === "over") {
      return "Partida terminada. Te quedaste sin vidas.";
    }

    if (!currentNote || match.lastResult === "idle") {
      return "Escucha una nota y elige tu respuesta.";
    }

    if (match.lastResult === "correct") {
      return `Bien! Era ${currentNote.label}. +${match.multiplier} puntos.`;
    }

    return `Casi! Era ${currentNote.label}. Te queda${match.lives === 1 ? "" : "n"} ${match.lives} vida${match.lives === 1 ? "" : "s"}.`;
  })();

  const levelTarget = mode === "hard" ? (LEVEL_TARGET_SCORE[match.level] ?? LEVEL_TARGET_SCORE[5]) : null;
  const pointsToNextLevel =
    mode === "hard" && levelTarget ? Math.max(0, levelTarget - match.score) : null;

  return {
    mode,
    modeOptions: MODE_OPTIONS,
    soundProfile,
    soundProfileOptions: SOUND_PROFILE_OPTIONS,
    notes,
    playerName,
    nameDraft,
    highScore,
    score: match.score,
    streak: match.streak,
    attempts: match.attempts,
    lives: match.lives,
    combo: match.combo,
    multiplier: match.multiplier,
    level: match.level,
    levelTarget,
    pointsToNextLevel,
    accuracy,
    lastResult: match.lastResult,
    status: match.status,
    hasPlayedRound: match.hasPlayedRound,
    isAnswered: match.isAnswered,
    feedback,
    listenLabel,
    setNameDraft,
    savePlayer,
    changeMode,
    changeSoundProfile,
    playOrNext,
    submitGuess,
    resetScore,
  };
};
