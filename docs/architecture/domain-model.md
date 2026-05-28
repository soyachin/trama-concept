# Modelo de dominio

## Entidades principales

### TNode (Nudo)

Entidad atómica del grafo de conocimiento. Representa cualquier recurso universitario:
organizaciones, cursos, docentes, proyectos, laboratorios, etc.

```ts
interface TNode {
  id: string                    // Identificador único (slug del backend)
  type: string                  // Tipo de entidad (OrganizacionEstudiantil, Curso, Docente, ...)
  label: string                 // Nombre para mostrar
  description: string           // Descripción enriquecida (poblada vía fetchNodeDetail)
  tags: string[]                // Etiquetas para búsqueda/filtrado
  metadata?: Record<string, NodeMetaValue>  // Metadatos RDF (propiedades + relaciones)
  groupKey?: string             // Área/quipu al que pertenece (ej: "Especializada")
  synthetic?: boolean           // true para nodos estructurales del quipu (raíz, cabeceras)
  x, y, vx, vy: number         // Posición y velocidad (d3-force)
  fx?, fy?: number | null      // Posición fija durante arrastre
}
```

**Nodos sintéticos** (`synthetic: true`): no representan entidades reales del backend.
Estructuran el layout del quipu:
- **Root** (`__root__`): raíz central del quipu con la palabra "comunidad UTEC".
- **AreaHeader** (`__area__:{nombre}`): nudo cabecera por cada grupo del quipu.
  Organiza los nodos de datos en áreas visualmente delimitadas.

### TEdge (Arista / Cuerda)

Relación dirigida o simétrica entre dos nodos.

```ts
interface TEdge {
  source: string                // ID del nodo origen
  target: string                // ID del nodo destino
  predicate: string             // Tipo de relación (alianzaCon, perteneceArea, dictadoPor, ...)
  waveOff: number               // Offset de fase determinista para animación de cuerda
  synthetic?: boolean           // true para edges estructurales (quipu, perteneceArea)
}
```

**Edges sintéticas** (`synthetic: true`): conectan la estructura jerárquica del quipu:
- `quipu`: root → AreaHeader (3 fibras, cuerda no dirigida).
- `perteneceArea`: AreaHeader → nodo de datos (1 fibra, cuerda no dirigida).

**Edges relacionales**: representan relaciones RDF reales del backend. Cada predicado
define su propia configuración visual (número de fibras, twist, dash pattern).

### QuipuGraph

Conjunto completo de datos de un quipu listo para visualización.

```ts
interface QuipuGraph {
  id: string                    // Identificador del quipu (ej: "quipu-social")
  label: string                 // Nombre para mostrar (ej: "Trama social")
  groups: { key: string }[]     // Grupos/áreas del quipu
  nodes: TNode[]                // Todos los nodos (sintéticos + datos)
  edges: TEdge[]                // Todas las aristas (sintéticas + relaciones)
}
```

### ExplorationSession

Estado de runtime mutable que comparten React y el render loop de p5.

```ts
interface ExplorationSession {
  quipuId: string               // Quipu actualmente cargado
  nodes: TNode[]                // Referencia viva a los nodos (p5 los lee cada frame)
  edges: TEdge[]                // Referencia viva a las aristas
  camera: CameraState           // Pan y zoom actuales
  selId: string | null          // Nodo seleccionado
  hovId: string | null          // Nodo bajo el cursor
  dragging: boolean             // Si el usuario está arrastrando un nodo
  dragNode: TNode | null        // Nodo en arrastre
  dStartX, dStartY: number      // Origen del arrastre
  time: number                  // Tiempo de simulación (frames desde inicio)
  intro: 'showing' | 'dissolving' | 'done'  // Máquina de estados de la intro
  introSec: number              // Segundos en la intro
  dissolve: number              // Progreso de disolución (0→1)
  simulation: unknown           // Referencia a d3.Simulation<TNode, undefined>
}
```

**Regla de acceso**: React escribe en `sessionRef.current` al cargar datos; p5 lee cada
frame y muta campos de interacción (cámara, selección). React nunca lee `sessionRef`
para decidir renders — usa `panelNode`, `enrichedNode`, etc. en React state.

### QuipuSummary

Metadatos ligeros de un quipu, usados en el selector.

```ts
interface QuipuSummary {
  id: string
  label: string
  description: string
  status: 'active' | 'coming-soon'
}
```

### CameraState

```ts
interface CameraState {
  panX: number
  panY: number
  zoom: number
}
```

---

## Quipu "social" vs. quipus futuros

### Quipu Social (actual)

El primer quipu implementado. Agrupa organizaciones estudiantiles por área temática:
- **Grupos**: Especializada, Arte y Cultura, Clubes Deportivos.
- **Predicados**: `alianzaCon` (simétrica), `organizadoPor`, `coorganizadoPor`, `asesoradoPor`.
- **Layout**: raíz sintética + nudos cabecera por área + nodos en arco alrededor de cada cabecera.

### Extensión a otros quipus

El sistema está diseñado para soportar quipus adicionales sin cambios estructurales:

- **Quipu Académico**: cursos, docentes, carreras, prerequisitos.
  Predicados: `dictadoPor`, `prerequisitoDe`, `perteneceA`.
- **Quipu de Investigación**: grupos de investigación, proyectos, laboratorios.
  Predicados: `investigaEn`, `participaEn`, `ubicadoEn`, `usaContenidoDe`.

Cada quipu define sus propios `groups`, `nodes`, y `edges` vía el endpoint
`GET /api/v1/quipus/{id}/graph`. El frontend los consume uniformemente a través
de `adaptQuipuGraph()`.

---

## Ciclo de vida de un nodo enriquecido

1. El usuario selecciona un nodo en el canvas → `sessionRef.current.selId = n.id`
2. p5 llama `onNodeSelect(node)` → React establece `setPanelNode(nodeId)`
3. `useQuipuSession` detecta el cambio y llama `fetchNodeDetail(slug, endpoint)`
4. La respuesta se combina con el nodo existente vía `enrichNode(node, detail)`
5. El nodo enriquecido se guarda en `enrichedNode` (React state) → InfoPanel re-renderiza
