"use client";

import { ModeSwitch } from "@/components/game/mode-switch";
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
            <button className="player-save" type="button" onClick={game.savePlayer}>
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
            <span>Record de {game.playerName}</span>
            <strong>{game.highScore}</strong>
          </article>
        </div>
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

        <div className="pads-grid" role="group" aria-label="Botones de notas">
          {game.notes.map((note) => (
            <button
              key={note.id}
              type="button"
              className="note-pad"
              onClick={() => game.submitGuess(note.id)}
              disabled={!game.hasPlayedRound || game.isAnswered}
            >
              {note.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
