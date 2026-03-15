# Diseno Tecnico - Next Level (SDD)

## Arquitectura Objetivo

Separar el juego por dominios para crecer sin inflar la UI:

- `domain/game`: reglas (scoring, vidas, combo, niveles).
- `domain/audio`: reproduccion, perfil sonoro, colas/cancelacion.
- `domain/progression`: desbloqueos, logros, estado de nivel.
- `domain/profile`: datos de jugador y estadisticas.
- `ui/components`: componentes presentacionales.
- `ui/hooks`: hooks de orquestacion (thin controllers).

## Modelo de Datos (Local)

```ts
type PlayerProfile = {
  id: string;
  name: string;
  createdAt: string;
  preferredMode: "easy" | "hard";
  preferredSound: "piano" | "synth";
};

type ProgressState = {
  playerId: string;
  unlockedLevel: number;
  achievements: string[];
  cosmeticsUnlocked: string[];
  statsByMode: Record<string, {
    games: number;
    bestScore: number;
    bestStreak: number;
    accuracyAvg: number;
  }>;
};

type MatchState = {
  level: number;
  lives: number;
  combo: number;
  multiplier: number;
  score: number;
  round: number;
};
```

## Flujos Clave

1. Inicio de partida

- Cargar perfil + progreso.
- Resolver reglas del nivel (pool de notas, dificultad, ritmo).
- Inicializar `MatchState`.

1. Resolucion de ronda

- Reproducir nota o secuencia.
- Validar respuesta.
- Actualizar score/combo/vidas.
- Emitir feedback.
- Verificar condicion de fin (sin vidas o objetivo alcanzado).

1. Fin de partida

- Guardar stats agregadas.
- Evaluar desbloqueos/logros.
- Mostrar resumen y CTA de reintento/siguiente nivel.

## Contratos Internos

- `GameEngine`
  - `startMatch(config)`
  - `submitAnswer(payload)`
  - `nextRound()`
  - `finishMatch()`

- `ProgressEngine`
  - `evaluateUnlocks(matchResult, progress)`
  - `applyUnlocks(progress, unlocks)`

- `AudioEngine`
  - `playNote(noteId, soundProfile)`
  - `playSequence(noteIds, soundProfile)`
  - `playFeedback(result)`

## Persistencia

Mantener `localStorage` en V3 con versionado de schema:

- Key base: `oa:v3:*`
- Migracion: leer claves v2 y mapear a estructuras v3 al primer inicio.

## Testing Strategy

- Unit: reglas de scoring, combo, vidas, desbloqueos.
- Integration: flujo completo de partida por modo.
- UI: estados clave (inicio, ronda activa, game over, victoria).
- Regression: compatibilidad de progreso v2 -> v3.

## Decisiones de UX

- One primary action en juego (escuchar/repetir/siguiente).
- Complejidad progresiva, no simultanea.
- Feedback en <150ms percibidos.
- Mantener paridad mobile/desktop.
