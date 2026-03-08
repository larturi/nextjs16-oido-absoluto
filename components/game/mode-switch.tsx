"use client";

import { GameMode, GameModeOption } from "@/lib/game";

type ModeSwitchProps = {
  value: GameMode;
  options: GameModeOption[];
  onChange: (mode: GameMode) => void;
};

export function ModeSwitch({ value, options, onChange }: ModeSwitchProps) {
  return (
    <div className="mode-switch" role="group" aria-label="Modo de dificultad">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`mode-chip ${value === option.id ? "active" : ""}`}
          onClick={() => onChange(option.id)}
        >
          <span>{option.label}</span>
          <small>{option.hint}</small>
        </button>
      ))}
    </div>
  );
}
