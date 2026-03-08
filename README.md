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
- Feedback inmediato visual + sonido + mensaje
- Puntaje, racha y precision
- Record local por jugador y por modo de dificultad
- Responsive para movil y desktop

## Audios

- Notas: `public/audio/notes/*.wav`
- Efectos: `public/audio/sfx/correct.wav` y `public/audio/sfx/wrong.wav`
