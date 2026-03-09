"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_MODE,
  DEFAULT_PLAYER_NAME,
  DEFAULT_SOUND_PROFILE,
  feedbackText,
  getAudioSrcForNote,
  GameMode,
  getNotesForMode,
  MODE_OPTIONS,
  NoteConfig,
  NoteId,
  pickRandomNote,
  resolveRound,
  RoundResult,
  SOUND_PROFILE_OPTIONS,
  SoundProfile,
} from "@/lib/game";
import {
  getGameMode,
  getHighScore,
  getPlayerName,
  getSoundProfile,
  setGameMode,
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

  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastResult, setLastResult] = useState<RoundResult>("idle");
  const [currentNote, setCurrentNote] = useState<NoteConfig | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [hasPlayedRound, setHasPlayedRound] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const notes = useMemo(() => getNotesForMode(mode), [mode]);
  const audioBankRef = useRef<AudioBank | null>(null);

  useEffect(() => {
    const loadedName = getPlayerName();
    const loadedMode = getGameMode();
    const loadedSoundProfile = getSoundProfile();

    setPlayerNameState(loadedName);
    setNameDraft(loadedName);
    setMode(loadedMode);
    setSoundProfileState(loadedSoundProfile);
    setHighScoreState(getHighScore(loadedName, loadedMode));
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
    setIsPlaying(true);

    const onEnded = () => {
      setIsPlaying(false);
      audio.removeEventListener("ended", onEnded);
    };
    audio.addEventListener("ended", onEnded);

    try {
      await audio.play();
    } catch {
      // Ignore autoplay restrictions to keep UX responsive.
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
      // Ignore playback errors to preserve game flow.
    }
  }, []);

  const resetRoundState = useCallback(() => {
    setLastResult("idle");
    setCurrentNote(null);
    setIsAnswered(false);
    setHasPlayedRound(false);
  }, []);

  const resetScore = useCallback(() => {
    setScore(0);
    setAttempts(0);
    setStreak(0);
    resetRoundState();
  }, [resetRoundState]);

  const playOrNext = useCallback(async () => {
    if (currentNote && !isAnswered) {
      await playNote(currentNote.id);
      return;
    }

    const next = pickRandomNote(notes, currentNote?.id);
    setCurrentNote(next);
    setLastResult("idle");
    setIsAnswered(false);
    setHasPlayedRound(true);
    await playNote(next.id);
  }, [currentNote, isAnswered, notes, playNote]);

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
            setHighScore(playerName, mode, nextScore);
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
    [currentNote, hasPlayedRound, highScore, isAnswered, mode, playSfx, playerName],
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

      setMode(setGameMode(nextMode));
      setHighScoreState(getHighScore(playerName, nextMode));
      resetScore();
    },
    [mode, playerName, resetScore],
  );

  const changeSoundProfile = useCallback((nextSoundProfile: SoundProfile) => {
    if (nextSoundProfile === soundProfile) {
      return;
    }

    setSoundProfileState(setSoundProfile(nextSoundProfile));
  }, [soundProfile]);

  const accuracy = useMemo(() => {
    if (attempts === 0) {
      return 0;
    }

    return Math.round((score / attempts) * 100);
  }, [attempts, score]);

  const listenLabel = !currentNote ? "Escuchar nota" : isAnswered ? "Siguiente nota" : "Repetir nota";

  return {
    mode,
    modeOptions: MODE_OPTIONS,
    soundProfile,
    soundProfileOptions: SOUND_PROFILE_OPTIONS,
    notes,
    playerName,
    nameDraft,
    highScore,
    score,
    streak,
    accuracy,
    lastResult,
    hasPlayedRound,
    isAnswered,
    isPlaying,
    feedback: feedbackText(lastResult, currentNote),
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
