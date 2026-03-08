# Oido Absoluto Arcade

Juego web para entrenar oido musical adivinando notas.

## Ejecutar

```bash
npm install --no-fund --no-audit --cache .npm-cache
npm run dev
```

Abrir `http://localhost:3000`.

## Funcionalidades

- Modo infinito por rondas
- Boton inteligente: escuchar, repetir o pasar a la siguiente
- Dificultad `Normal`: notas naturales (Do, Re, Mi, Fa, Sol, La, Si)
- Dificultad `Dificil`: incluye sostenidos (Do#, Re#, Fa#, Sol#, La#)
- Selector de sonido: `Piano` o `Synth`
- Feedback inmediato visual + sonido + mensaje
- Puntaje, racha y precision
- Record local por jugador y por modo de dificultad
- Preferencias guardadas: nombre, dificultad y tipo de sonido
- Responsive para movil y desktop

## Audios

- Piano: `public/audio/notes/*.wav`
- Synth: `public/audio/notes-synth/*.wav`
- Efectos: `public/audio/sfx/correct.wav` y `public/audio/sfx/wrong.wav`
