"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { beginRound, createMatchState, LEVEL_TARGET_SCORE, scoreAnswer, shouldAdvanceLevel } from "@/domain/game/engine";
import { getNotePoolForLevel } from "@/domain/game/progression";
import { migrateLegacyStorageV2ToV3 } from "@/domain/profile/migration";
import {
  getOrCreateActiveProfileSnapshot,
  recordCompletedMatch,
  updateProfilePreferences,
  updateUnlockedLevel,
  upsertSessionBest,
} from "@/domain/profile/repository";
import { ProgressState } from "@/domain/profile/types";
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
  const [hardUnlockedLevel, setHardUnlockedLevel] = useState(1);
  const [highScore, setHighScoreState] = useState(0);
  const [profileCreatedAt, setProfileCreatedAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [match, setMatch] = useState(() => createMatchState(1, INITIAL_LIVES));

  const notes = useMemo(() => getNotePoolForLevel(mode, match.level), [mode, match.level]);
  const noteMap = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const currentNote = match.currentNoteId ? noteMap.get(match.currentNoteId) ?? null : null;

  const audioBankRef = useRef<AudioBank | null>(null);

  useEffect(() => {
    migrateLegacyStorageV2ToV3();
    const snapshot = getOrCreateActiveProfileSnapshot();

    setPlayerNameState(snapshot.profile.name);
    setNameDraft(snapshot.profile.name);
    setMode(snapshot.profile.preferredMode);
    setSoundProfileState(snapshot.profile.preferredSound);
    setProfileCreatedAt(snapshot.profile.createdAt);
    setProgress(snapshot.progress);
    setHardUnlockedLevel(snapshot.progress.unlockedLevel);
    setHighScoreState(snapshot.progress.statsByMode[snapshot.profile.preferredMode].bestScore);
    setMatch(createMatchState(snapshot.profile.preferredMode === "hard" ? snapshot.progress.unlockedLevel : 1, INITIAL_LIVES));
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

  const persistCompletedMatch = useCallback(
    (attempts: number, score: number) => {
      if (attempts === 0) {
        return;
      }

      const accuracy = Math.round((score / attempts) * 100);
      const progress = recordCompletedMatch(mode, accuracy);
      setProgress(progress);
      setHardUnlockedLevel(progress.unlockedLevel);
      setHighScoreState(progress.statsByMode[mode].bestScore);
    },
    [mode],
  );

  const resetMatch = useCallback(
    (level?: number) => {
      persistCompletedMatch(match.attempts, match.score);
      const nextLevel = level ?? (mode === "hard" ? hardUnlockedLevel : 1);
      setMatch(createMatchState(nextLevel, INITIAL_LIVES));
      setStatusMessage(null);
    },
    [hardUnlockedLevel, match.attempts, match.score, mode, persistCompletedMatch],
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
        const progress = updateUnlockedLevel(nextLevel);
        setProgress(progress);
        setHardUnlockedLevel(progress.unlockedLevel);

        nextState = {
          ...nextState,
          level: nextLevel,
          combo: 0,
          multiplier: 1,
        };
        setStatusMessage(`Nivel ${nextLevel} desbloqueado!`);
      }

      const nextAccuracy = nextState.attempts > 0 ? Math.round((nextState.score / nextState.attempts) * 100) : 0;
      const progress = upsertSessionBest(mode, nextState.score, nextState.streak, nextAccuracy);

      setProgress(progress);
      setHardUnlockedLevel(progress.unlockedLevel);
      setHighScoreState(progress.statsByMode[mode].bestScore);
      setMatch(nextState);
      await playSfx(outcome.wasCorrect ? "correct" : "wrong");
    },
    [match, mode, playSfx],
  );

  const savePlayer = useCallback(() => {
    const safeName = nameDraft.trim() || DEFAULT_PLAYER_NAME;
    setPlayerNameState(safeName);
    setNameDraft(safeName);

    const snapshot = updateProfilePreferences({ name: safeName });
    setProfileCreatedAt(snapshot.profile.createdAt);
    setProgress(snapshot.progress);
    setHardUnlockedLevel(snapshot.progress.unlockedLevel);
    setHighScoreState(snapshot.progress.statsByMode[mode].bestScore);
  }, [mode, nameDraft]);

  const changeMode = useCallback(
    (nextMode: GameMode) => {
      if (nextMode === mode) {
        return;
      }

      persistCompletedMatch(match.attempts, match.score);
      setMode(nextMode);
      updateProfilePreferences({ preferredMode: nextMode });

      const snapshot = getOrCreateActiveProfileSnapshot();
      const nextLevel = nextMode === "hard" ? snapshot.progress.unlockedLevel : 1;

      setProgress(snapshot.progress);
      setHardUnlockedLevel(snapshot.progress.unlockedLevel);
      setHighScoreState(snapshot.progress.statsByMode[nextMode].bestScore);
      setMatch(createMatchState(nextLevel, INITIAL_LIVES));
      setStatusMessage(null);
    },
    [match.attempts, match.score, mode, persistCompletedMatch],
  );

  const changeSoundProfile = useCallback(
    (nextSoundProfile: SoundProfile) => {
      if (nextSoundProfile === soundProfile) {
        return;
      }

      setSoundProfileState(nextSoundProfile);
      updateProfilePreferences({ preferredSound: nextSoundProfile });
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

  const easyStats = progress?.statsByMode.easy;
  const hardStats = progress?.statsByMode.hard;
  const totalGames = (easyStats?.games ?? 0) + (hardStats?.games ?? 0);

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
    profileCreatedAt,
    totalGames,
    easyGames: easyStats?.games ?? 0,
    hardGames: hardStats?.games ?? 0,
    easyAccuracyAvg: easyStats?.accuracyAvg ?? 0,
    hardAccuracyAvg: hardStats?.accuracyAvg ?? 0,
    easyBestStreak: easyStats?.bestStreak ?? 0,
    hardBestStreak: hardStats?.bestStreak ?? 0,
    hardUnlockedLevel,
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
