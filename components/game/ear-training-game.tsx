"use client";

import { ModeSwitch } from "@/components/game/mode-switch";
import { PianoKeyboard } from "@/components/game/piano-keyboard";
import { useEarTrainingGame } from "@/hooks/use-ear-training-game";

export function EarTrainingGame() {
  const game = useEarTrainingGame();

  return (
    <main className="arcade-shell">
      <section className="hud-card">
        <div>
          <p className="overline">Oido Absoluto Arcade</p>
          <h1>Entrena jugando con notas musicales</h1>
        </div>

        <ModeSwitch
          value={game.mode}
          options={game.modeOptions}
          onChange={game.changeMode}
          ariaLabel="Modo de dificultad"
        />
        <ModeSwitch
          value={game.soundProfile}
          options={game.soundProfileOptions}
          onChange={game.changeSoundProfile}
          ariaLabel="Tipo de sonido"
        />
        <ModeSwitch
          value={game.playMode}
          options={game.playModeOptions}
          onChange={game.changePlayMode}
          ariaLabel="Modo de juego"
          className="mode-switch-3"
        />

        <label className="player-input" htmlFor="playerName">
          Jugador
          <div>
            <input
              id="playerName"
              value={game.nameDraft}
              onChange={(event) => game.setNameDraft(event.target.value)}
              onBlur={game.savePlayer}
              maxLength={24}
            />
            <button
              className="player-save"
              type="button"
              onClick={game.savePlayer}
            >
              Guardar
            </button>
          </div>
        </label>

        <div className="stats-grid">
          <article>
            <span>Puntos</span>
            <strong>{game.score}</strong>
          </article>
          <article>
            <span>Racha</span>
            <strong>{game.streak}</strong>
          </article>
          <article>
            <span>Precision</span>
            <strong>{game.accuracy}%</strong>
          </article>
          <article>
            <span>Vidas</span>
            <strong>{game.lives}</strong>
          </article>
          <article>
            <span>Combo</span>
            <strong>x{game.combo}</strong>
          </article>
          <article>
            <span>Multiplicador</span>
            <strong>x{game.multiplier}</strong>
          </article>
          <article>
            <span>Nivel</span>
            <strong>{game.mode === "hard" ? game.level : "Base"}</strong>
          </article>
          <article>
            <span>Record</span>
            <strong>{game.highScore}</strong>
          </article>
        </div>
        {game.mode === "hard" && game.pointsToNextLevel !== null && (
          <p className="level-progress">
            {game.pointsToNextLevel === 0
              ? "Objetivo del nivel alcanzado."
              : `Faltan ${game.pointsToNextLevel} puntos para el siguiente nivel.`}
          </p>
        )}

      </section>

      <section className={`game-card ${game.isPlaying ? "playing" : ""}`} aria-live="polite">
        <div className="round-actions">
          <button className="cta" type="button" onClick={game.playOrNext}>
            {game.listenLabel}
          </button>

          <button className="ghost" type="button" onClick={game.resetScore}>
            Reiniciar puntaje
          </button>
        </div>

        <p className={`feedback ${game.lastResult}`}>{game.feedback}</p>

        <PianoKeyboard
          notes={game.notes}
          onPress={game.submitGuess}
          disabled={!game.hasPlayedRound || game.isAnswered || game.status === "over" || game.isPlaying}
        />
      </section>

      <section className="progress-panel progress-panel-wide" aria-label="Progreso del jugador">
        <h2>Progreso</h2>
        <div className="progress-grid">
          <article>
            <span>Partidas</span>
            <strong>{game.totalGames}</strong>
          </article>
          <article>
            <span>Nivel desbloqueado</span>
            <strong>{game.hardUnlockedLevel}</strong>
          </article>
          <article>
            <span>Normal: accuracy</span>
            <strong>{game.easyAccuracyAvg}%</strong>
          </article>
          <article>
            <span>Dificil: accuracy</span>
            <strong>{game.hardAccuracyAvg}%</strong>
          </article>
          <article>
            <span>Normal: mejor racha</span>
            <strong>{game.easyBestStreak}</strong>
          </article>
          <article>
            <span>Dificil: mejor racha</span>
            <strong>{game.hardBestStreak}</strong>
          </article>
        </div>
      </section>
    </main>
  );
}
