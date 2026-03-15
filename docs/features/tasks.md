# Tasks - Next Level (SDD)

## Epic 1: Core de Progresion

- [x] T1.1 Crear `domain/game` con `GameEngine` y tipos de `MatchState`.
- [x] T1.2 Implementar vidas, combo y multiplicador.
- [x] T1.3 Implementar niveles con reglas por dificultad.
- [x] T1.4 Integrar reglas de fin de partida y resumen.
- [x] T1.5 Cubrir con tests unitarios de scoring/vidas/combo.

## Epic 2: Modos de Juego

- [x] T2.1 Refactor de modo actual a contrato comun `GameModeHandler`.
- [x] T2.2 Implementar modo `memory-sequence`.
- [x] T2.3 Implementar modo `interval-guess`.
- [x] T2.4 Selector de modo en UI con estado persistido.
- [ ] T2.5 Tests de integracion por modo.

## Epic 3: Perfil y Progreso

- [x] T3.1 Crear modelo `PlayerProfile` y `ProgressState` v3.
- [x] T3.2 Crear repositorio local (`profile-repo`, `progress-repo`).
- [x] T3.3 Implementar migracion de storage v2 -> v3.
- [x] T3.4 Dashboard basico de progreso por jugador.
- [x] T3.5 Tests de migracion y lectura/escritura.

## Epic 4: Recompensas

- [ ] T4.1 Definir catalogo inicial de logros.
- [ ] T4.2 Implementar `ProgressEngine.evaluateUnlocks`.
- [ ] T4.3 UI de desbloqueos post-partida.
- [ ] T4.4 Integrar cosmeticos desbloqueables (tema/pads).
- [ ] T4.5 Tests de reglas de desbloqueo.

## Epic 5: Audio y Experiencia

- [ ] T5.1 Extraer `AudioEngine` dedicado con cola de reproduccion.
- [x] T5.2 Soporte estable para perfiles de sonido (`piano`, `synth`, extensible).
- [ ] T5.3 Normalizar volumen/latencia entre sonidos.
- [ ] T5.4 Opciones de audio en configuracion (volumen nota/sfx).
- [ ] T5.5 Tests de integracion de flujo sonoro.

## Orden de Implementacion Recomendado

1. Epic 1 (base de reglas)
2. Epic 3 (persistencia robusta)
3. Epic 2 (nuevos modos)
4. Epic 4 (recompensas)
5. Epic 5 (audio avanzado)
6. Epic 6 (cierre de calidad)

## Definition of Done (Global)

- Tests unitarios e integracion en verde.
- Build/lint en verde.
- Sin regresiones en modo clasico actual.
- Compatibilidad de datos previos verificada.
- UX valida en mobile y desktop.

## Log de Actualizacion

- 2026-03-15: completadas T1.1, T1.2, T1.3, T1.4, T2.4 y T5.2.
- 2026-03-15: completada T1.5 con Vitest y pruebas unitarias en `tests/domain/game/engine.test.ts`.
- 2026-03-15: completadas T3.1, T3.2 y T3.3 con modelo v3, repositorio local y migracion desde claves legacy.
- 2026-03-15: completadas T3.4 y T3.5 con dashboard de progreso y tests de repositorio/migracion.
- 2026-03-15: ajuste UX de layout sin scroll vertical, moviendo progreso a un tercer bloque de ancho completo.
- 2026-03-15: layout desktop centrado (horizontal y vertical) para los tres bloques principales.
- 2026-03-15: completadas T2.1, T2.2 y T2.3 con contrato `GameModeHandler` y nuevos modos Clasico/Memoria/Intervalos.
- 2026-03-15: fix de modo Memoria (reproduccion secuencial sin solaparse + validacion por secuencia completa).
- 2026-03-15: fix de input en Memoria para reproducir la nota inmediatamente al presionar cada boton.
- 2026-03-15: ajuste de layout desktop para eliminar scroll interno en el primer contenedor (HUD) con densidad compacta.
- 2026-03-15: interfaz de notas mejorada con teclado de piano (toggle Pads/Piano) y estilos responsivos.
- 2026-03-15: fix visual del teclado piano para mostrar y posicionar claramente teclas negras en modo dificil.
- 2026-03-15: refinamiento visual del piano: teclas negras siempre visibles, mas largas y con negro de alto contraste.
- 2026-03-15: simplificacion UX, eliminando selector Pads/Piano para dejar teclado de piano como interfaz unica.
- 2026-03-15: ajuste visual extra del piano con teclas negras aun mas largas (mobile + desktop).
- 2026-03-15: mejora responsive de interfaz de notas: pads en mobile y piano en desktop automaticamente.
- 2026-03-15: recalibracion visual del piano en desktop (más alto, con negras más cortas que las blancas).
- 2026-03-15: ajuste de layout para que el piano en desktop ocupe todo el alto disponible del contenedor de juego.
- 2026-03-15: ajuste de encastre desktop: mantiene acciones+feedback arriba y el piano llena solo el bloque inferior.
- 2026-03-15: ajuste de proporciones desktop: piano ~30% menos alto y mayor presencia para acciones+feedback.
