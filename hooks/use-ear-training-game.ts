"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { beginRound, createMatchState, LEVEL_TARGET_SCORE, scoreAnswer, shouldAdvanceLevel } from "@/domain/game/engine";
import { getNotePoolForLevel } from "@/domain/game/progression";
import { getModeHandler, PLAY_MODE_OPTIONS, PlayMode } from "@/domain/game/modes";
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
const PLAYBACK_GAP_MS = 220;
const NOTE_FALLBACK_DURATION_MS = 950;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const [playMode, setPlayMode] = useState<PlayMode>("classic");
  const [soundProfile, setSoundProfileState] = useState<SoundProfile>(DEFAULT_SOUND_PROFILE);
  const [hardUnlockedLevel, setHardUnlockedLevel] = useState(1);
  const [highScore, setHighScoreState] = useState(0);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [roundInstruction, setRoundInstruction] = useState("Escucha una nota y elige tu respuesta.");
  const [playbackSequence, setPlaybackSequence] = useState<NoteId[]>([]);
  const [expectedSequence, setExpectedSequence] = useState<NoteId[]>([]);
  const [sequenceProgress, setSequenceProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
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
    setPlayMode(snapshot.profile.preferredPlayMode ?? "classic");
    setSoundProfileState(snapshot.profile.preferredSound);
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

      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) {
            return;
          }
          done = true;
          audio.removeEventListener("ended", finish);
          resolve();
        };

        const timeoutMs =
          Number.isFinite(audio.duration) && audio.duration > 0
            ? Math.round(audio.duration * 1000) + 80
            : NOTE_FALLBACK_DURATION_MS;

        audio.addEventListener("ended", finish, { once: true });
        window.setTimeout(finish, timeoutMs);
      });
    } catch {
      // Ignore autoplay restrictions to keep UX responsive.
    }
  }, []);

  const playSequence = useCallback(
    async (sequence: NoteId[]) => {
      if (sequence.length === 0) {
        return;
      }

      setIsPlaying(true);

      try {
        for (const noteId of sequence) {
          await playNote(noteId);
          await sleep(PLAYBACK_GAP_MS);
        }
      } finally {
        setIsPlaying(false);
      }
    },
    [playNote],
  );

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

  const playInputNote = useCallback((noteId: NoteId) => {
    const bank = audioBankRef.current;
    if (!bank) {
      return;
    }

    const audio = bank.notes.get(noteId);
    if (!audio) {
      return;
    }

    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Ignore interaction playback errors.
    });
  }, []);

  const persistCompletedMatch = useCallback(
    (attempts: number, score: number) => {
      if (attempts === 0) {
        return;
      }

      const accuracy = Math.round((score / attempts) * 100);
      const nextProgress = recordCompletedMatch(mode, accuracy);
      setProgress(nextProgress);
      setHardUnlockedLevel(nextProgress.unlockedLevel);
      setHighScoreState(nextProgress.statsByMode[mode].bestScore);
    },
    [mode],
  );

  const resetMatch = useCallback(
    (level?: number) => {
      persistCompletedMatch(match.attempts, match.score);
      const nextLevel = level ?? (mode === "hard" ? hardUnlockedLevel : 1);
      setMatch(createMatchState(nextLevel, INITIAL_LIVES));
      setStatusMessage(null);
      setPlaybackSequence([]);
      setExpectedSequence([]);
      setSequenceProgress(0);
      setRoundInstruction("Escucha una nota y elige tu respuesta.");
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

    if (isPlaying) {
      return;
    }

    if (match.currentNoteId && !match.isAnswered) {
      await playSequence(playbackSequence);
      return;
    }

    const challenge = getModeHandler(playMode).createChallenge({
      notes,
      difficulty: mode,
      level: match.level,
      previousAnswerId: match.currentNoteId ?? undefined,
    });

    setRoundInstruction(challenge.instruction);
    setPlaybackSequence(challenge.playback);
    setExpectedSequence(playMode === "memory-sequence" ? challenge.playback : [challenge.answerId]);
    setSequenceProgress(0);
    setMatch((prev) => beginRound(prev, challenge.answerId));
    await playSequence(challenge.playback);
  }, [isPlaying, match, mode, notes, playMode, playbackSequence, playSequence, resetMatch]);

  const submitGuess = useCallback(
    async (guess: NoteId) => {
      if (isPlaying || !match.currentNoteId || !match.hasPlayedRound || match.isAnswered || match.status === "over") {
        return;
      }
      playInputNote(guess);
      setStatusMessage(null);

      if (playMode === "memory-sequence" && expectedSequence.length > 0) {
        const expected = expectedSequence[sequenceProgress];

        if (guess === expected) {
          const isLast = sequenceProgress === expectedSequence.length - 1;

          if (!isLast) {
            const nextStep = sequenceProgress + 1;
            setSequenceProgress(nextStep);
            setStatusMessage(`Bien! Sigue con la secuencia (${nextStep + 1}/${expectedSequence.length}).`);
            return;
          }

          const correctOutcome = scoreAnswer({ ...match, currentNoteId: expected }, expected);
          let correctState = correctOutcome.next;

          if (mode === "hard" && shouldAdvanceLevel(correctState.level, correctState.score)) {
            const nextLevel = Math.min(correctState.level + 1, 5);
            const nextProgress = updateUnlockedLevel(nextLevel);
            setProgress(nextProgress);
            setHardUnlockedLevel(nextProgress.unlockedLevel);

            correctState = {
              ...correctState,
              level: nextLevel,
              combo: 0,
              multiplier: 1,
            };
            setStatusMessage(`Nivel ${nextLevel} desbloqueado!`);
          }

          const correctAccuracy = correctState.attempts > 0 ? Math.round((correctState.score / correctState.attempts) * 100) : 0;
          const correctProgress = upsertSessionBest(mode, correctState.score, correctState.streak, correctAccuracy);
          setProgress(correctProgress);
          setHardUnlockedLevel(correctProgress.unlockedLevel);
          setHighScoreState(correctProgress.statsByMode[mode].bestScore);
          setMatch(correctState);
          await playSfx("correct");
          return;
        }

        const wrongOutcome = scoreAnswer({ ...match, currentNoteId: expected }, guess);
        const wrongState = wrongOutcome.next;
        const wrongAccuracy = wrongState.attempts > 0 ? Math.round((wrongState.score / wrongState.attempts) * 100) : 0;
        const wrongProgress = upsertSessionBest(mode, wrongState.score, wrongState.streak, wrongAccuracy);
        setProgress(wrongProgress);
        setHardUnlockedLevel(wrongProgress.unlockedLevel);
        setHighScoreState(wrongProgress.statsByMode[mode].bestScore);
        setMatch(wrongState);
        await playSfx("wrong");
        return;
      }

      const outcome = scoreAnswer(match, guess);
      let nextState = outcome.next;

      if (outcome.wasCorrect && mode === "hard" && shouldAdvanceLevel(nextState.level, nextState.score)) {
        const nextLevel = Math.min(nextState.level + 1, 5);
        const nextProgress = updateUnlockedLevel(nextLevel);
        setProgress(nextProgress);
        setHardUnlockedLevel(nextProgress.unlockedLevel);

        nextState = {
          ...nextState,
          level: nextLevel,
          combo: 0,
          multiplier: 1,
        };
        setStatusMessage(`Nivel ${nextLevel} desbloqueado!`);
      }

      const nextAccuracy = nextState.attempts > 0 ? Math.round((nextState.score / nextState.attempts) * 100) : 0;
      const nextProgress = upsertSessionBest(mode, nextState.score, nextState.streak, nextAccuracy);

      setProgress(nextProgress);
      setHardUnlockedLevel(nextProgress.unlockedLevel);
      setHighScoreState(nextProgress.statsByMode[mode].bestScore);
      setMatch(nextState);
      await playSfx(outcome.wasCorrect ? "correct" : "wrong");
    },
    [expectedSequence, isPlaying, match, mode, playInputNote, playMode, playSfx, sequenceProgress],
  );

  const savePlayer = useCallback(() => {
    const safeName = nameDraft.trim() || DEFAULT_PLAYER_NAME;
    setPlayerNameState(safeName);
    setNameDraft(safeName);

    const snapshot = updateProfilePreferences({ name: safeName });
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
      setPlaybackSequence([]);
      setExpectedSequence([]);
      setSequenceProgress(0);
    },
    [match.attempts, match.score, mode, persistCompletedMatch],
  );

  const changePlayMode = useCallback(
    (nextPlayMode: PlayMode) => {
      if (nextPlayMode === playMode) {
        return;
      }

      setPlayMode(nextPlayMode);
      updateProfilePreferences({ preferredPlayMode: nextPlayMode });
      setMatch((prev) => ({
        ...prev,
        currentNoteId: null,
        hasPlayedRound: false,
        isAnswered: false,
        lastResult: "idle",
      }));
      setPlaybackSequence([]);
      setExpectedSequence([]);
      setSequenceProgress(0);
      setRoundInstruction("Escucha una nota y elige tu respuesta.");
    },
    [playMode],
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
          : "Repetir audio";

  const feedback = (() => {
    if (statusMessage) {
      return statusMessage;
    }

    if (match.status === "over") {
      return "Partida terminada. Te quedaste sin vidas.";
    }

    if (!currentNote || match.lastResult === "idle") {
      if (playMode === "memory-sequence" && expectedSequence.length > 0 && match.hasPlayedRound && !match.isAnswered) {
        return `Repite la secuencia: paso ${sequenceProgress + 1} de ${expectedSequence.length}.`;
      }

      return roundInstruction;
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
    playMode,
    playModeOptions: PLAY_MODE_OPTIONS,
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
    isPlaying,
    feedback,
    roundInstruction,
    listenLabel,
    setNameDraft,
    savePlayer,
    changeMode,
    changePlayMode,
    changeSoundProfile,
    playOrNext,
    submitGuess,
    resetScore,
  };
};
