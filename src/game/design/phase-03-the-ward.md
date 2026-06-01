# Game 3 — The Star Maze

**Fase:** `phase-03`  
**Estado:** implementado MVP (pulido de distribución/feedback pendiente)  
**Ruta dev:** `/play/3`  
**Código:** `src/game/environments/phase-03-the-ward/`

---

## Objetivo del juego

El jugador ve dos columnas verticales de estrellas de color:

- Izquierda: una estrella por color/dedo, en orden fijo.
- Derecha: las mismas estrellas de color, en otro orden.
- Centro: rejilla densa de estrellas blancas/neutras (~250+) cubriendo el campo entre columnas.

El objetivo es conectar cada estrella izquierda con su estrella derecha del mismo color usando rayos láser, sin que un rayo cruce otro de diferente color.

**Victoria:** 5/5 colores conectados → modal → Game 4.

---

## Input

### Índices solamente

Game 3 usa las puntas de los dedos índice de ambas manos. El overlay de manos se muestra sin colores ni esqueleto: solo dos círculos blancos en los índices detectados.

| Acción | Resultado |
|--------|-----------|
| Tocar estrella izquierda de color | Inicia o reinicia el rayo de ese color |
| Tocar estrella blanca | Fija un segmento hasta esa estrella |
| Tocar el último nodo de una ruta | Reactiva el rayo desde ese punto |
| Tocar estrella derecha del mismo color | Completa ese color |
| Tocar ruta que cruza otro color | Rechaza el segmento |

---

## Mecánica

1. El jugador toca una estrella de color en la columna izquierda.
2. Aparece un rayo provisional desde esa estrella hasta el índice.
3. Al tocar una estrella blanca, el segmento queda fijado.
4. Desde esa estrella se puede seguir conectando hacia otra estrella.
5. Al llegar a la estrella derecha del mismo color, el color queda completado.
6. El botón **Reset** superior reinicia el puzzle si el trazado deja el tablero bloqueado.

Las estrellas blancas usadas pasan a adoptar el color del rayo que las ocupa.

---

## Implementación técnica

### Archivos

| Archivo | Rol |
|---------|-----|
| `StarMazeEnvironment.ts` | Campo de estrellas, rutas, segmentos láser, colisiones, victoria |
| `src/game/events/phase-reset.ts` | Evento UI → entorno para reiniciar Game 3 |
| `HandOverlay.tsx` | Variante `index-only` para mostrar solo índices blancos |
| `PlayChrome.tsx` | Botón Reset cuando `currentPhaseId === "phase-03"` |

### Reglas de conexión

- Solo el índice (`finger = "index"`) activa nodos en pantalla.
- Un nodo neutral no puede pertenecer a dos colores.
- No se permite repetir nodos dentro de una misma ruta.
- Antes de fijar un segmento se comprueba intersección 2D contra segmentos del **mismo color** y de **otros colores**.
- La victoria se latchea cuando `completed.size === FINGER_NAMES.length`.

### Runtime HUD

| Campo | Uso |
|-------|-----|
| `progress` | colores completados / 5 |
| `statusHint` | instrucción contextual |
| `victoryLatched` | abre modal de victoria |
| `phaseComplete` | fase terminada |
| `handOverlayActive` | siempre `true` |

---

## Pendiente / iteración

- Ajustar el generador de estrellas para garantizar tableros más cómodos.
- Mejorar feedback visual cuando un segmento cruza otro color.
- Añadir animación de chispa al fijar cada segmento.
- Revisar si el orden derecho debe ser variable por partida o diseñado a mano.

---

## Referencias

- Probes de pantalla: [../docs/05-touch-probes-and-screen-space.md](../docs/05-touch-probes-and-screen-space.md)
- UI layers: [../docs/02-ui-layers-and-overlays.md](../docs/02-ui-layers-and-overlays.md)
