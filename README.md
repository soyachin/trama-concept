# trama · concept
> visualización interactiva del grafo de conocimiento universitario, inspirada en el quipu.

---

este es el frontend de [trama](https://github.com/soyachin/trama): un sitio web donde toda la universidad se representa como un **grafo vivo de conocimiento**. cada entidad universitaria es un nodo, cada relación entre ellas es una arista con significado.

el diseño visual está inspirado en el **quipu** — sistema de registro del imperio inca basado en cuerdas anudadas. las aristas son cuerdas trenzadas cuyo número de fibras refleja la fuerza de la relación. los nodos son nudos con geometría distinta por tipo de entidad.

---

## cómo se ve

- **aristas como cuerdas**: multi-fibra con twist animado. `participaEn` tiene 4 fibras (relación fuerte), `alianzaCon` tiene 3, `dictadoPor` tiene 2, `ubicadoEn` tiene 1.
- **nodos como nudos**: clubs son nudos densos redondos, cursos tienen un diamante interior, docentes llevan una cruz (autoridad), proyectos son elongados horizontales, departamentos son hexagonales.
- **textura de gasa**: cuadrícula de hilos perpendiculares casi imperceptible sobre el fondo oscuro, homenaje al tejido andino.
- **selección**: halo dithered alrededor del nodo seleccionado, cuerdas conectadas se iluminan en naranja con un punto viajero, nodos no conectados se desvanecen.

---

## stack

| capa | tecnología |
|------|-----------|
| framework | React 19 + TypeScript |
| build | Vite |
| renderizado | p5.js (Canvas 2D) |
| física | d3-force |
| datos | consume `GET /api/v1/graph` del backend trama |

---

## cómo correrlo

### requisitos

- node 20+
- pnpm (o npm)
- el [backend de trama](https://github.com/soyachin/trama) corriendo en `localhost:8000` (opcional — sin backend carga datos dummy)

### desarrollo

```bash
pnpm install
pnpm dev
```

abre `http://localhost:5173`. si el backend está corriendo, carga el grafo completo (1548 nodos, 1597 aristas). si no, carga datos dummy de ejemplo.

### build

```bash
pnpm build
pnpm preview
```

### configuración

| variable | default | descripción |
|----------|---------|-------------|
| `VITE_API_URL` | `/api/v1` | URL base de la API del backend |

para apuntar a un backend remoto:
```bash
VITE_API_URL=https://api.trama.example.com/api/v1 pnpm dev
```

---

## estructura

```
src/
  components/
    graph/
      TramaGraph.tsx          componente principal del grafo
      useGraphSimulation.ts   loop de render p5 + simulación d3-force
      useGraphInteraction.ts  pan, zoom, click, hover, drag, touch
    ui/
      InfoPanel.tsx           panel lateral de detalle del nodo
      SearchBar.tsx           búsqueda de nodos
      EdgeLegend.tsx          leyenda de cuerdas (canvas)
    overlay/
      OverlayLayer.tsx        capa de UI sobre el canvas
  config/
    visuals.ts                colores, configs de cuerdas, configs de nudos
  data/
    graph.ts                  fetch de la API + fallback dummy
  lib/
    render.ts                 drawRope(), drawKnot(), viewport culling, LOD
    layout.ts                 posicionamiento inicial en anillos concéntricos
  types/
    graph.ts                  TNode, TEdge, NodeVisual, EdgeVisual
  styles/
    tokens.css                variables CSS (colores, fuentes, sombras)
```

---

## optimizaciones de rendimiento

el grafo tiene 1548 nodos y 1597 aristas. para mantener 60fps:

- **viewport culling** — solo dibuja nodos y aristas visibles en la pantalla actual.
- **level-of-detail (LOD)** — zoom > 0.55: nudos detallados + cuerdas multi-fibra. zoom 0.25–0.55: círculos simples + líneas. zoom < 0.25: solo puntos.
- **textura pre-renderizada** — la gasa de fondo se dibuja una vez en un offscreen canvas y se reutiliza cada frame.
- **adjacency map O(1)** — lookup de nodos conectados pre-computado, en vez de `edges.filter()` O(n) por frame.
- **d3-force adaptivo** — parámetros de fuerza ajustados según el tamaño del grafo (charge más débil, distancia más corta para grafos grandes).

---

## tipos de entidad

| tipo | color | forma del nudo | cantidad |
|------|-------|----------------|----------|
| Club | `#6366f1` | redondo denso con figure-8 | 42 |
| Curso | `#22c55e` | diamante interior, aplanado | 409 |
| Docente | `#f59e0b` | anillo con cruz | 408 |
| Carrera | `#ec4899` | redondo denso | 13 |
| Departamento | `#14b8a6` | hexagonal | 13 |
| GrupoInvestigacion | `#f97316` | hexagonal | 19 |
| Proyecto | `#ef4444` | elongado horizontal | 163 |
| Laboratorio | `#06b6d4` | elongado horizontal | 27 |
| Equipo | `#8b5cf6` | punto simple | 454 |

---

> **trama es para cualquiera que sienta que la universidad le está dando menos de lo que podría darle.**
