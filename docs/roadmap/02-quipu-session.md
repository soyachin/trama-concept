# Fase 2 — Modelo de sesión de quipu

> **Prioridad:** 🔴 Crítica  
> **Prerequisito de:** Fase 3  
> **Prerequisitos:** Fase 1  
> **Estimación:** 3–4 sesiones de agente

---

## Problema que resuelve

No existe un concepto de "sesión de quipu" en la arquitectura. El ciclo de vida completo de
una sesión (inicializar cámara, crear simulación, limpiar al cambiar de quipu) está distribuido
entre tres lugares sin que ninguno tenga responsabilidad completa:

- `useGraphSimulation` crea la instancia p5 y la simulación d3.
- `useGraphInteraction` registra los event listeners.
- `TramaGraph` maneja el fetch, el estado de loading, y resetea `nodes`/`edges`.

Pero `SimulationState` — que incluye `panX`, `panY`, `zoom`, `selId`, `hovId` — **no se resetea
al cambiar de quipu**. La simulación d3 anterior puede seguir ejecutando ticks hasta que el
efecto de cleanup la destruya. No hay ningún lugar en el código donde decir "esto es lo que
ocurre cuando se carga un quipu nuevo".

---

## Goal de la fase

Al terminar esta fase:

- Existe un tipo `ExplorationSession` que encapsula todo el estado de una sesión activa:
  cámara, selección, hover, referencia a la simulación.
- El ciclo de vida de la sesión (crear al cargar un quipu, destruir al cambiar) tiene un
  dueño único: un hook `useQuipuSession`.
- `TramaGraph` solo coordina: llama a `useQuipuSession` y pasa el resultado a los layouts.
- Cambiar de quipu garantiza que el estado de sesión anterior se destruye completamente antes
  de inicializar el nuevo.

---

## Estructura de archivos objetivo

```
src/
  types/
    graph.ts        ← agregar ExplorationSession
    session.ts      ← (opcional) si ExplorationSession crece mucho
  hooks/
    useQuipuSession.ts   ← nuevo — dueño del ciclo de vida completo
  components/
    graph/
      TramaGraph.tsx         ← simplificado: solo coordinación
      useGraphSimulation.ts  ← recibe session en vez de stateRef
      useGraphInteraction.ts ← recibe session en vez de stateRef
```

---

## Tasks

### Task 2.1 — Definir el tipo `ExplorationSession`

**Contexto:** Antes de mover código, necesitamos un tipo que describa qué es una sesión.
Esto fuerza una decisión explícita sobre qué pertenece a la sesión vs. qué pertenece al componente.

**Acciones:**
1. En `src/types/graph.ts` (o en un nuevo `src/types/session.ts`), definir:
   ```ts
   export interface CameraState {
     panX: number
     panY: number
     zoom: number
   }

   export interface ExplorationSession {
     // Identidad
     quipuId: string

     // Grafo cargado
     nodes: TNode[]
     edges: TEdge[]

     // Cámara
     camera: CameraState

     // Interacción
     selId: string | null
     hovId: string | null
     dragging: boolean
     dragNode: TNode | null
     dStartX: number
     dStartY: number

     // Animación
     time: number
     intro: 'showing' | 'dissolving' | 'done'
     introSec: number
     dissolve: number

     // Referencias externas (no serializables)
     simulation: d3.Simulation<TNode, undefined> | null
   }
   ```
2. Eliminar `SimulationState` de `useGraphSimulation.ts` y reemplazar con `ExplorationSession`
   (puede ser un alias temporal mientras se migra).
3. Verificar que `pnpm build` pasa (puede requerir ajustar imports).

**Criterio de aceptación:** Existe el tipo `ExplorationSession`. `SimulationState` es un alias
o está eliminado. Build limpio.

---

### Task 2.2 — Crear `useQuipuSession`

**Contexto:** Este hook es el dueño del ciclo de vida. Recibe el `quipuId` activo y devuelve
la sesión actual como un ref mutable (igual que hoy, para no forzar re-renders en cada tick).

**Acciones:**
1. Crear `src/hooks/useQuipuSession.ts`.
2. El hook recibe `quipuId: string` y devuelve `sessionRef: React.MutableRefObject<ExplorationSession>`.
3. Mover a este hook la lógica de fetch de `TramaGraph`:
   - El `useEffect` que llama a `fetchQuipuGraph` y maneja el fallback.
   - El estado `loading` y `stats`.
4. Cuando `quipuId` cambia, el hook debe **resetear explícitamente** el estado de sesión antes
   de iniciar el fetch del nuevo quipu:
   ```ts
   useEffect(() => {
     // Reset de sesión
     sessionRef.current = createInitialSession(quipuId)
     setLoading(true)
     // ... fetch
   }, [quipuId])
   ```
5. Exponer también `loading: boolean` y `stats: { nodes: number; edges: number }`.

**Criterio de aceptación:** El hook existe y maneja el ciclo de vida completo. `TramaGraph`
puede importarlo y obtener la sesión sin tener el fetch inline.

---

### Task 2.3 — Migrar `useGraphSimulation` a recibir `sessionRef`

**Contexto:** Actualmente `useGraphSimulation` recibe `nodes`, `edges`, y el `stateRef` que
es `SimulationState`. Con la sesión centralizada, los nodos y edges viven en `sessionRef.current`.

**Acciones:**
1. Cambiar la firma de `useGraphSimulation`:
   ```ts
   // Antes
   useGraphSimulation(containerRef, nodes, edges, searchRef, stateRef)

   // Después
   useGraphSimulation(containerRef, sessionRef, searchRef)
   ```
2. Dentro del hook, leer `nodes` y `edges` de `sessionRef.current`.
3. Escribir `sessionRef.current.simulation` en vez de `stateRef.current.simulation`.
4. Verificar que el efecto de cleanup destruye la instancia p5 correctamente.
5. Verificar que `pnpm build` pasa.

**Criterio de aceptación:** `useGraphSimulation` no recibe `nodes` ni `edges` como parámetros
separados. Lee todo de `sessionRef`.

---

### Task 2.4 — Migrar `useGraphInteraction` a recibir `sessionRef`

**Acciones:**
1. Cambiar la firma de `useGraphInteraction`:
   ```ts
   // Antes
   useGraphInteraction(containerRef, nodes, stateRef, setPanelNode)

   // Después
   useGraphInteraction(containerRef, sessionRef, setPanelNode)
   ```
2. Dentro del hook, leer `nodes` de `sessionRef.current.nodes`.
3. Verificar que `flyTo` sigue funcionando con la nueva estructura de cámara (`session.camera`).
4. Verificar que `pnpm build` pasa.

**Criterio de aceptación:** `useGraphInteraction` no recibe `nodes` como parámetro separado.

---

### Task 2.5 — Simplificar `TramaGraph`

**Contexto:** Con `useQuipuSession` manejando el ciclo de vida, `TramaGraph` puede reducirse
a un componente de coordinación que pasa datos a los layouts.

**Acciones:**
1. Reemplazar el `useEffect` de fetch y el `stateRef` manual por una llamada a `useQuipuSession`:
   ```ts
   const { sessionRef, loading, stats } = useQuipuSession(activeQuipuId)
   ```
2. Eliminar los estados `nodes`, `edges`, y el `stateRef` que se creaban inline.
3. Construir el `edgeIndex` dentro de `useQuipuSession` o como un `useMemo` sobre `sessionRef.current`.
4. Verificar que el comportamiento del panel de info (`panelNode`, `setPanelNode`) sigue correcto.
5. Verificar que `pnpm build` pasa y la app funciona.

**Criterio de aceptación:** `TramaGraph` no tiene `useEffect` de fetch inline. El componente
tiene menos de 120 líneas. Build limpio.

---

## Checklist de cierre de fase

- [ ] Task 2.1 completa — `ExplorationSession` definido, `SimulationState` eliminado
- [ ] Task 2.2 completa — `useQuipuSession` existe y maneja fetch + ciclo de vida
- [ ] Task 2.3 completa — `useGraphSimulation` recibe `sessionRef`
- [ ] Task 2.4 completa — `useGraphInteraction` recibe `sessionRef`
- [ ] Task 2.5 completa — `TramaGraph` simplificado, sin fetch inline
- [ ] Cambiar de quipu resetea completamente el estado de cámara y selección
- [ ] `pnpm build` pasa sin warnings

---

## Issue

```
Title: [Fase 2] Modelo de sesión de quipu

## Problema

El ciclo de vida de una sesión de exploración (inicializar, cambiar de quipu, destruir)
está distribuido entre TramaGraph, useGraphSimulation y useGraphInteraction sin que ninguno
tenga responsabilidad completa. Cambiar de quipu no resetea el estado de cámara ni de
selección, y la simulación d3 anterior puede seguir ejecutando ticks tras el cambio.

## Objetivo

Centralizar el ciclo de vida en un hook useQuipuSession con un tipo ExplorationSession
explícito. TramaGraph pasa a ser solo un coordinador de layouts.

## Prerequisito

Fase 1 debe estar completa (el tipo de sesión trabaja con el modelo interno limpio).

## Tasks

- [ ] 2.1 Definir tipo ExplorationSession, eliminar SimulationState
- [ ] 2.2 Crear useQuipuSession — dueño del fetch y ciclo de vida
- [ ] 2.3 Migrar useGraphSimulation a sessionRef
- [ ] 2.4 Migrar useGraphInteraction a sessionRef
- [ ] 2.5 Simplificar TramaGraph a coordinador puro

## Definition of Done

- SimulationState no existe en el codebase.
- Cambiar de quipu produce un reset completo y verificable del estado de sesión.
- TramaGraph tiene menos de 120 líneas.
- pnpm build limpio.

## Referencias

Ver docs/roadmap/02-quipu-session.md
```
