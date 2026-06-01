# Game 4 — The Elemental Orrery

**Fase:** `phase-04`  
**Estado:** implementado MVP  
**Ruta dev:** `/play/4`  
**Código:** `src/game/environments/phase-04-the-vault/`

---

## Objetivo del juego

Puzzle final de universo + elementos. El jugador ve un orrery cósmico con cuatro órbitas:

- **Fuego**
- **Agua**
- **Aire**
- **Tierra**

Por fuera de las órbitas flotan estrellas/partículas de esos elementos. El objetivo es enganchar cada estrella con un índice y llevarla hasta su órbita. Cuando una estrella toca su órbita, empieza a orbitar y queda energizada. Al colocar todas las estrellas, se desbloquea el núcleo central.

**Victoria:** todas las estrellas orbitando + índice derecho en el núcleo → finale global con confetti.

---

## Dinámicas

### Dinámica A — Arrastre con índices

| Aspecto | Detalle |
|---------|---------|
| Input | Índice izquierdo o derecho |
| Colisión | 2D en pantalla (`tip.pixel` / proyección), no profundidad |
| Acción | Tocar una estrella elemental |
| Resultado | La estrella queda capturada y sigue al índice que la tocó en el plano del juego |

El overlay de manos usa `index-only`: se ven los dos índices; la estrella queda asociada al dedo que la tocó.

### Dinámica B — Entrada en órbita

| Aspecto | Detalle |
|---------|---------|
| Acción | Llevar la estrella a la órbita de su elemento |
| Éxito | La estrella empieza a orbitar y se energiza |
| Error | Si la estrella capturada toca otra estrella de diferente color, explota y reinicia |
| Meta | Todas las estrellas orbitando |

Cada órbita se ilumina más conforme más estrellas de su elemento orbitan.

### Dinámica C — Choque de colores

| Aspecto | Detalle |
|---------|---------|
| Regla | Si la estrella capturada toca otra estrella de diferente color en 2D, explotan |
| Consecuencia | El puzzle vuelve al inicio |
| Feedback | Modal: “Your stars imploded — Try again” |

### Dinámica D — Cierre del núcleo

Cuando todas las estrellas están orbitando:

1. Aparece el núcleo central.
2. El jugador mantiene el índice derecho sobre el núcleo.
3. Tras un hold corto, `victoryLatched = true`.
4. `PhaseVictoryOverlay` llama `completeEscape()` y aparece el finale.

---

## Implementación técnica

### Archivos

| Archivo | Rol |
|---------|-----|
| `ElementalOrreryEnvironment.ts` | Órbitas, estrellas, colisiones 2D, explosión/reset, núcleo final |
| `index.ts` | Export factory |
| `registry.ts` | Registra `phase-04` |
| `HandOverlay.tsx` | Variante visual `index-only` |
| `PhaseImplosionOverlay.tsx` | Modal de implosión tras choque de colores |

### Constantes principales

| Constante | Valor |
|-----------|-------|
| `PARTICLES_PER_ELEMENT` | 4 |
| `PARTICLE_TOUCH_RADIUS_PX` | 64 |
| `PARTICLE_COLLISION_RADIUS_PX` | 44 |
| `ORBIT_TOUCH_BAND_PX` | 34 |
| `CORE_TOUCH_RADIUS_PX` | 118 |
| `FINAL_HOLD_MS` | 650 |

### Runtime

| Campo | Uso |
|-------|-----|
| `progress` | estrellas orbitando + hold final |
| `statusHint` | instrucción contextual |
| `victoryLatched` | activa modal final |
| `coreOrbVisible` | núcleo visible cuando todas las estrellas orbitan |
| `fingersInCore` | 1 cuando el índice derecho está en núcleo |
| `handOverlayActive` | siempre `true` |

---

## Pendiente / iteración

- Afinar las posiciones iniciales de estrellas para que no arranquen demasiado cerca entre sí.
- Añadir labels sutiles por elemento o símbolos visuales.
- Añadir animación de alineación de órbitas al completar la cuarta.
- Añadir reset específico si el jugador quiere reiniciar el tablero.

---

## Referencias

- Flujo final: [../docs/01-session-and-flow.md](../docs/01-session-and-flow.md)
- Probes de pantalla: [../docs/05-touch-probes-and-screen-space.md](../docs/05-touch-probes-and-screen-space.md)
