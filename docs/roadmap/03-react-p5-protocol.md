# Fase 3 — Protocolo React ↔ p5

> **Prioridad:** 🟠 Alta  
> **Prerequisito de:** (ninguno, es hoja)  
> **Prerequisitos:** Fases 1 y 2  
> **Estimación:** 4–6 sesiones de agente

---

## Problema que resuelve

p5 y React corren dos loops de rendering en paralelo sin contrato entre ellos. El estado real
de la app vive en `sessionRef` (un objeto mutable), no en React. Esto hace que:

- React no puede razonar sobre cuándo redibujar el UI en respuesta a cambios del canvas.
- p5 no puede saber cuándo React ha montado, desmontado o actualizado un componente.
- Toda feature nueva que necesite coordinación (transiciones entre quipus, sincronización del
  panel con el grafo) se implementa como efectos secundarios sobre el ref mutable.

El objetivo de esta fase no es eliminar p5 — la decisión de usar p5 para el canvas es válida y
el rendering es correcto. El objetivo es establecer un **contrato unidireccional claro**:
React es la única fuente de verdad para el estado de la app, y p5 es un renderer que recibe
instrucciones de React. El estado del canvas que necesita afectar la UI (nodo seleccionado,
hover) debe fluir de vuelta a React a través de callbacks, no a través del ref mutable directamente.

---

## Goal de la fase

Al terminar esta fase:

- p5 recibe el grafo, la cámara inicial y los callbacks como "props" inmutables al montarse.
- p5 notifica a React de cambios de estado relevantes (selección, hover) a través de callbacks.
- React no lee estado desde `sessionRef` para decidir qué renderizar; lee estado de React state.
- El ref mutable (`sessionRef`) existe solo como canal de comunicación de performance-sensitive
  state (posición de cámara, coordenadas de drag) que no necesita triggear re-renders.

---

## Conceptos clave

### Estado que SÍ necesita triggear re-renders de React

- `selectedNodeId` / `panelNode` — determina si el panel está visible.
- `loading` — determina si se muestra el spinner.
- `quipuId` activo — determina qué se renderiza.

### Estado que NO necesita triggear re-renders (vive en el ref mutable)

- `panX`, `panY`, `zoom` — se actualiza 60 veces por segundo.
- `hovId` — igual.
- `dragNode`, `dragging`, `dStartX`, `dStartY` — estado interno de interacción.
- `time`, `introSec`, `dissolve` — estado de animación.
- Referencia a la simulación d3.

---

## Tasks

### Task 3.1 — Definir la interfaz de "props" de p5

**Contexto:** p5 se monta una sola vez por quipu. Necesita recibir todo lo que necesita al
montarse, sin que React lo llame de nuevo en cada render.

**Acciones:**
1. Definir en `useGraphSimulation.ts` (o en un archivo de tipos) la interfaz de configuración
   que p5 recibe al montarse:
   ```ts
   export interface P5CanvasConfig {
     nodes: TNode[]
     edges: TEdge[]
     initialCamera: CameraState
     searchRef: React.RefObject<string>
     // Callbacks hacia React
     onNodeSelect: (node: TNode | null) => void
     onNodeHover: (node: TNode | null) => void
   }
   ```
2. No hay código que cambiar todavía — esto es solo la definición del contrato.

**Criterio de aceptación:** El tipo `P5CanvasConfig` existe y está documentado con un comentario
que explica el flujo de datos.

---

### Task 3.2 — Mover `setPanelNode` dentro de p5 como callback

**Contexto:** Actualmente `useGraphInteraction` llama a `setPanelNode` directamente. Pero
`setPanelNode` es un setter de estado de React, y llamarlo desde dentro de un event listener
de p5 es correcto pero implícito. La idea es formalizarlo como un callback de la config.

**Acciones:**
1. Modificar `useGraphSimulation` para que reciba `onNodeSelect` como parte de la config.
2. Dentro de p5, cuando un nodo es seleccionado/deseleccionado, llamar a `onNodeSelect(node)`.
3. Esto reemplaza la llamada directa a `setPanelNode` que actualmente ocurre en
   `useGraphInteraction`.
4. `useGraphInteraction` deja de existir como hook separado; su lógica de event listeners
   se incorpora a `useGraphSimulation` bajo la sección `p.setup` o en handlers explícitos.

**Nota:** Fusionar `useGraphInteraction` en `useGraphSimulation` es una decisión de diseño.
La alternativa es mantenerlos separados y pasar callbacks entre ellos. Si el agente considera
que mantenerlos separados es más claro, puede hacerlo, pero los dos hooks deben coordinarse
a través de callbacks, no a través del `sessionRef` compartido directamente.

**Criterio de aceptación:** `setPanelNode` no se llama desde `useGraphInteraction` leyendo
el ref mutable. Se llama a través de un callback formalizado.

---

### Task 3.3 — Separar camera state del session ref

**Contexto:** `panX`, `panY`, `zoom` se actualizan 60 veces por segundo y no deben triggear
re-renders de React. Pero `flyTo` necesita poder animarlos. La solución es mantenerlos en el
ref mutable pero exponer una función `setCameraState` que también los sincronice si hay algún
consumidor de React que los necesite (actualmente no hay ninguno).

**Acciones:**
1. Aislar `camera: { panX, panY, zoom }` dentro de `ExplorationSession` como un sub-objeto
   (ya modelado en la Fase 2).
2. Verificar que `flyTo` lee y escribe `session.camera.*` en vez de `s.panX`, `s.panY`, `s.zoom`.
3. Verificar que el render de p5 lee `session.camera.*` en el `draw()`.
4. Si algún componente de React necesita la posición de cámara en el futuro, el patrón correcto
   es un callback `onCameraChange` — documentarlo como comentario en `useQuipuSession`.

**Criterio de aceptación:** `panX`, `panY`, `zoom` son siempre `session.camera.panX`,
`session.camera.panY`, `session.camera.zoom`. No hay referencias sueltas `s.panX`.

---

### Task 3.4 — Documentar el contrato en un diagrama de flujo de datos

**Contexto:** El contrato React ↔ p5 es el invariante más importante de la arquitectura.
Debe estar documentado explícitamente para que cualquier contribuidor lo entienda sin leer
todo el código.

**Acciones:**
1. Crear `docs/architecture/data-flow.md` con un diagrama ASCII o Mermaid que muestre:
   ```
   React state
     ├── quipuId ──────────────────────► useQuipuSession
     │                                        │
     │                                   fetch + adapt
     │                                        │
     │                                   sessionRef (mutable)
     │                                        │
     │                              ┌─────────┴─────────┐
     │                         p5 canvas            callbacks
     │                         (draw loop)          onNodeSelect
     │                              │                    │
     │                         event handlers            ▼
     │                              └──────────► setPanelNode
     │
     └── panelNode ◄────────────────────────────────────┘
         loading
         stats
   ```
2. Documentar explícitamente qué estado vive en el ref mutable y por qué.

**Criterio de aceptación:** El archivo existe y describe correctamente el flujo de datos
después de completar las tasks 3.1–3.3.

---

### Task 3.5 — Verificar comportamiento en React Strict Mode

**Contexto:** React Strict Mode hace doble invocación de efectos en desarrollo para detectar
side effects no puros. Si `useGraphSimulation` tiene efectos no puros (y los tiene: crea una
instancia p5 que inyecta un canvas en el DOM), Strict Mode puede crear instancias duplicadas.

**Acciones:**
1. Habilitar `<React.StrictMode>` en `src/main.tsx` si no está habilitado.
2. Verificar que en desarrollo no aparecen dos instancias del canvas.
3. Si aparecen, asegurar que el cleanup del `useEffect` de p5 es completo:
   ```ts
   return () => {
     instance.remove()            // destruye el canvas del DOM
     sessionRef.current.simulation?.stop()
     sessionRef.current.simulation = null
   }
   ```
4. Verificar que la doble invocación no deja listeners colgados.

**Criterio de aceptación:** La app funciona correctamente con `<React.StrictMode>` activado
en desarrollo. No hay instancias duplicadas de canvas ni listeners colgados.

---

## Checklist de cierre de fase

- [ ] Task 3.1 completa — `P5CanvasConfig` definido
- [ ] Task 3.2 completa — selección de nodo fluye por callback, no por ref directo
- [ ] Task 3.3 completa — camera state aislado como sub-objeto
- [ ] Task 3.4 completa — diagrama de flujo de datos documentado
- [ ] Task 3.5 completa — Strict Mode habilitado y sin bugs
- [ ] `useGraphInteraction` fusionado en `useGraphSimulation` o coordinado por callbacks
- [ ] `pnpm build` pasa sin warnings

---

## Issue

```
Title: [Fase 3] Protocolo React ↔ p5

## Problema

p5 y React corren dos loops de rendering en paralelo sin contrato entre ellos.
El estado real de la app vive en un ref mutable que ambos leen y escriben sin
protocolo. Esto hace imposible razonar sobre el flujo de datos y dificulta
agregar features que requieran coordinación entre el canvas y el UI.

## Objetivo

Establecer un contrato unidireccional: React es la fuente de verdad para el
estado que afecta el UI, p5 es un renderer que recibe sus datos al montarse y
notifica cambios relevantes a través de callbacks.

## Prerequisitos

Fases 1 y 2 deben estar completas.

## Tasks

- [ ] 3.1 Definir interfaz P5CanvasConfig
- [ ] 3.2 Mover setPanelNode como callback formal de p5
- [ ] 3.3 Aislar camera state como sub-objeto de ExplorationSession
- [ ] 3.4 Documentar flujo de datos en docs/architecture/data-flow.md
- [ ] 3.5 Verificar comportamiento en React Strict Mode

## Definition of Done

- setPanelNode no se llama desde dentro de un ref mutable sin pasar por callback.
- React.StrictMode habilitado sin bugs en desarrollo.
- docs/architecture/data-flow.md existe y describe el flujo correctamente.
- pnpm build limpio.

## Referencias

Ver docs/roadmap/03-react-p5-protocol.md
```
