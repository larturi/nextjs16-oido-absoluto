"use client";

import { NoteConfig, NoteId } from "@/lib/game";

type PianoKeyboardProps = {
  notes: NoteConfig[];
  disabled: boolean;
  onPress: (noteId: NoteId) => void;
};

const WHITE_KEYS: Array<{ id: NoteId; label: string }> = [
  { id: "do", label: "Do" },
  { id: "re", label: "Re" },
  { id: "mi", label: "Mi" },
  { id: "fa", label: "Fa" },
  { id: "sol", label: "Sol" },
  { id: "la", label: "La" },
  { id: "si", label: "Si" },
];

const BLACK_KEYS: Array<{ id: NoteId; label: string; colStart: number }> = [
  { id: "doSharp", label: "Do#", colStart: 2 },
  { id: "reSharp", label: "Re#", colStart: 4 },
  { id: "faSharp", label: "Fa#", colStart: 8 },
  { id: "solSharp", label: "Sol#", colStart: 10 },
  { id: "laSharp", label: "La#", colStart: 12 },
];

export function PianoKeyboard({ notes, disabled, onPress }: PianoKeyboardProps) {
  const available = new Set(notes.map((note) => note.id));

  return (
    <div className="piano" role="group" aria-label="Teclado de piano">
      <div className="piano-whites">
        {WHITE_KEYS.map((key) => {
          const isAvailable = available.has(key.id);

          return (
            <button
              key={key.id}
              type="button"
              className="piano-white"
              onClick={() => onPress(key.id)}
              disabled={disabled || !isAvailable}
              aria-label={key.label}
            >
              <span>{key.label}</span>
            </button>
          );
        })}
      </div>

      <div className="piano-blacks" aria-hidden="true">
        {BLACK_KEYS.map((key) => {
          const isAvailable = available.has(key.id);

          return (
            <button
              key={key.id}
              type="button"
              className={`piano-black ${isAvailable ? "" : "is-unavailable"}`.trim()}
              style={{ gridColumn: `${key.colStart} / span 2` }}
              onClick={() => onPress(key.id)}
              disabled={disabled || !isAvailable}
              aria-label={key.label}
            >
              <span>{key.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
