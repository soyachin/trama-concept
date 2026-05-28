# Flujo de datos React ↔ p5

## Principio rector

React es la única fuente de verdad para el estado que afecta el UI. p5 es un renderer
que recibe sus datos al montarse y notifica cambios relevantes a través de callbacks. El
ref mutable (`sessionRef`) existe como canal para estado performance-sensitive que no debe
triggear re-renders de React.

## Diagrama de flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                         TramaGraph                              │
│                                                                 │
│  React state                  sessionRef (mutable)              │
│  ┌──────────────┐            ┌──────────────────────┐           │
│  │ quipuId      │──fetch──►  │ nodes[], edges[]     │◄──read───┐│
│  │ panelNode    │            │ camera: {pan, zoom}  │          ││
│  │ loading      │            │ selId, hovId         │          ││
│  │ stats        │            │ dragging, dragNode   │          ││
│  └──────┬───────┘            │ time, intro, sim     │          ││
│         │                    └─────────┬────────────┘          ││
│         │                              │                        ││
│         │                    ┌─────────▼────────────┐           ││
│         │                    │  useGraphSimulation  │           ││
│         │                    │                      │           ││
│         │   P5CanvasConfig   │  p5 draw loop ───────┘           ││
│         ├───────────────────►│    (lee sessionRef                ││
│         │   onNodeSelect     │     cada frame)                   ││
│         │   onNodeHover      │                                  ││
│         │   sessionRef       │  DOM event handlers              ││
│         │   searchRef        │    (mouse/touch/wheel)            ││
│         │                    │         │                        ││
│         │                    │         │ mutan sessionRef       ││
│         │                    │         │ (camera, selId, hovId) ││
│         │                    │         │                        ││
│         │◄───callback────────┘         ▼                        ││
│         │                    │  onNodeSelect(node)              ││
│    setPanelNode              │    → setPanelNode(node)          ││
│         │                    │  onNodeHover(nodeId)             ││
│         ▼                    │    → (no-op actualmente)         ││
│  ┌──────────────┐            └──────────────────────────────────┘│
│  │  InfoPanel   │                                               │
│  │  (muestra    │                                               │
│  │   enriched   │                                               │
│  │   node)      │                                               │
│  └──────────────┘                                               │
│                                                                 │
│  useQuipuSession ────► fetchQuipuGraph(quipuId)                 │
│      │                      │                                   │
│      │                 sessionRef.nodes/edges = data            │
│      │                 dataVersion++                            │
│      │                                                          │
│      └───► fetchNodeDetail(selectedNodeId)                      │
│                │                                                │
│           enrichNode → enrichedNode (React state)               │
└─────────────────────────────────────────────────────────────────┘
```

## Qué estado vive dónde

### En React state (dispara re-renders)

| Estado            | Hook                | Descripción                                    |
|-------------------|---------------------|------------------------------------------------|
| `loading`         | `useQuipuSession`   | Determina si se muestra el spinner de carga    |
| `detailLoading`   | `useQuipuSession`   | Determina si se muestra shimmer skeleton       |
| `enrichedNode`    | `useQuipuSession`   | Nodo enriquecido para el InfoPanel             |
| `panelNode`       | `TramaGraph`         | ID/señal de nodo seleccionado (dispara fetch) |
| `stats`           | `useQuipuSession`   | Conteo de nudos y cuerdas para el UI           |
| `dataVersion`     | `useQuipuSession`   | Contador que triggerea re-montaje de p5        |
| `activeQuipuId`   | `TramaGraph`         | Quipu activo seleccionado                      |
| `searchVal`       | `TramaGraph`         | Término de búsqueda del usuario                |

### En `sessionRef.current` (mutable, NO dispara re-renders)

| Campo               | Razón                                                    |
|---------------------|----------------------------------------------------------|
| `nodes[]`, `edges[]`| Datos del grafo; se leen 60 fps en el draw loop          |
| `camera.panX/Y/zoom`| Se actualiza 60 fps durante pan/zoom                     |
| `selId`, `hovId`    | Estado de selección/hover del canvas; se lee cada frame  |
| `dragging`, `dragNode` | Estado interno de interacción de arrastre             |
| `dStartX`, `dStartY` | Origen del drag; estado efímero                          |
| `time`, `introSec`, `dissolve` | Estado de animación (intro, disolución)         |
| `intro`             | Máquina de estados de la intro (`showing→dissolving→done`)|
| `simulation`        | Referencia a la simulación d3 (p5 la crea/altera)        |

## Contrato de acceso

### React escribe en `sessionRef`

Solo en `useQuipuSession`:
- `sessionRef.current = createInitialSession(quipuId)` — reset al cambiar quipu
- `sessionRef.current.nodes = data.nodes` — carga de datos
- `sessionRef.current.edges = data.edges`
- `sessionRef.current.simulation = null` — cleanup

### p5 escribe en `sessionRef`

Solo en `useGraphSimulation`:
- `s.camera.*` — durante pan, zoom, flyTo
- `s.selId`, `s.hovId` — durante interacción del usuario
- `s.dragging`, `s.dragNode`, `s.dStartX/Y` — durante arrastre
- `s.time`, `s.introSec`, `s.dissolve`, `s.intro` — en el draw loop
- `s.simulation` — referencia a d3.Simulation

### p5 notifica a React vía callbacks

- `onNodeSelect(node)` — cuando el usuario selecciona/deselecciona un nodo → `setPanelNode`
- `onNodeHover(nodeId)` — cuando el mouse pasa sobre un nodo (actualmente no-op)

### React NO lee `sessionRef` para decidir el UI

React nunca lee `sessionRef` para renderizar. El UI (InfoPanel, stats, loading) se
alimenta exclusivamente de React state (`panelNode`, `enrichedNode`, `loading`, etc.).

## P5CanvasConfig

Definido en `src/components/graph/useGraphSimulation.ts`:

```ts
interface P5CanvasConfig {
  containerRef: RefObject<HTMLDivElement | null>
  sessionRef: MutableRefObject<ExplorationSession>
  searchRef: RefObject<string>
  onNodeSelect: (node: TNode | null) => void
  onNodeHover: (nodeId: string | null) => void
  dataVersion: number
}
```

Es el único punto de entrada de React hacia p5. Todo lo que p5 necesita (refs para datos
performance-sensitive, callbacks para notificaciones) se canaliza a través de esta interfaz.

## Ciclo de vida de p5

1. **Montaje**: `useGraphSimulation` crea la instancia p5 cuando `dataVersion` cambia.
2. **Draw loop**: 60 fps. Lee `sessionRef.current` cada frame para nodos, edges, cámara.
3. **Event handlers**: DOM listeners en el container (mouse/touch/wheel) mutan `sessionRef`
   y llaman callbacks (`onNodeSelect`, `onNodeHover`).
4. **Desmontaje**: `instance.remove()` destruye el canvas, `sim.stop()` detiene la
   simulación d3, se remueven todos los DOM listeners.

En React Strict Mode (desarrollo), p5 se monta, desmonta y remonta. El cleanup es completo
(`instance.remove()`, `sim.stop()`, `removeEventListener`), por lo que no hay instancias
duplicadas ni listeners colgados.
