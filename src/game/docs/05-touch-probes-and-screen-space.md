# Probes de toque y espacio pantalla

## Coordenadas

Tres espacios usados en el proyecto:

| Espacio | Origen | Uso |
|---------|--------|-----|
| **Normalized mirrored** | 0–1, X espejado (selfie) | `tip.mirrored`, overlay de manos |
| **Canvas screen** | 0–1, sin espejo | `worldToScreen`, posición visual en WebGL |
| **Stage pixels** | `tip.pixel`, `stageWidth/Height` | Colisiones 2D (pixel espejado vs canvas) |
| **World Three.js** | Metros en escena | Posiciones de sellos, esferas, estrellas |

Utilidad compartida: `src/game/environments/screen-touch.ts`.

## `worldToMirroredScreen(world, camera)`

1. `vector.project(camera)` → NDC.
2. Convierte a 0–1 y espeja X (`1 - x`) para alinear con overlay de manos.

**Importante:** usar la **misma cámara** que renderiza el frame (FPS en Game 2, fija en 1 y 3).

## `fingerTouchesScreenTarget` / `fingerProximityToScreenTarget`

- Compara yema(s) de un `FingerName` con un target 2D.
- Prefiere `tip.pixel`; fallback `tip.mirrored` con radio normalizado.
- Radio típico: 88–170 px según objeto.

## `indexProximityToWorldOrb` (Game 1)

Combina:

- Proximidad en pantalla (proyección del orb).
- Proximidad en world space (`tip.world` vs centro).

Evita falsos negativos cuando depth/proyección no coinciden perfectamente.

## Game 2 — disco proyectado (`light-touch.ts`)

Para esferas en laberinto FPS:

1. Por cada luz: `world.project(camera)`; descartar si `z > 1` (detrás).
2. Radio en pantalla según distancia y FOV: `sphereScreenRadiusPx()`.
3. `fingerHitsScreenDisc`: cualquier dedo cuya yema entre en el disco.
4. Victoria: `allLightsRed()` — color === `FINGER_COLORS.thumb`.

Permite tocar esferas **mirándolas** en el render 2D del laberinto, sin radio 3D de proximidad al jugador.

## Game 3 — estrellas + índice (`StarMazeEnvironment.ts`)

- Proyecta cada estrella con **`worldToScreen`** (donde se ven en el canvas 3D).
- Compara con yemas `index` en **`tip.mirrored` / `tip.pixel`** (donde pinta el overlay).
- Utilidad: `indexTipProximityToWorldOnCanvas` en `screen-touch.ts`.
- El láser de arrastre usa `nearestIndexWorldOnZ` (raycast del índice espejado al plano `STAR_Z`).
- No usar `worldToMirroredScreen` aquí: espejaría el hitbox respecto a las estrellas visibles.

## Game 4 — partículas + órbitas (`ElementalOrreryEnvironment.ts`)

- Proyecta partículas elementales con `worldToMirroredScreen`.
- Usa los índices izquierdo y derecho.
- Captura una partícula si cualquier índice entra en su radio de pantalla.
- La partícula capturada queda asociada al índice que la tocó y sigue ese dedo proyectado a un plano de juego.
- Entra en órbita cuando su distancia 2D al anillo correcto cae dentro de la banda radial.
- Si la partícula capturada toca una partícula de otro color en 2D, el puzzle se reinicia y muestra el modal de implosión.
- El núcleo final requiere el índice derecho dentro del radio proyectado.

## Checklist nuevo probe

1. ¿Cámara correcta (FPS vs fija)?
2. ¿Coords en stage pixels o mirrored consistentes con `FingersFrame`?
3. ¿Misma función para feedback visual y `victoryLatched`?
4. ¿Constantes de radio documentadas en el MD del juego?
