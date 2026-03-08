"use client";

type ToggleOption<T extends string> = {
  id: T;
  label: string;
  hint: string;
};

type ModeSwitchProps<T extends string> = {
  value: T;
  options: ToggleOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
};

export function ModeSwitch<T extends string>({ value, options, onChange, ariaLabel }: ModeSwitchProps<T>) {
  return (
    <div className="mode-switch" role="group" aria-label={ariaLabel}>
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
