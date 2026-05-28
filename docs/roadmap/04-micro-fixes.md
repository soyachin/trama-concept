# Fase 4 — Correcciones micro

> **Prioridad:** 🟡 Media  
> **Prerequisito de:** (ninguno, es hoja)  
> **Prerequisitos:** Fase 1 (para el fix de waveOff con fixture JSON). Las demás tasks son independientes.  
> **Estimación:** 2–3 sesiones de agente

---

## Problema que resuelve

Una vez que la arquitectura macro está saneada, quedan bugs concretos que degradan la
experiencia de uso y deuda técnica visible en el código:

1. Hit-test con radio fijo que no escala con zoom ni con el tamaño visual real del nodo.
2. `waveOff` aleatorio que hace que las cuerdas "salten" visualmente al recargar datos.
3. Estado global mutable en `tokens.ts` que impide testear la asignación de colores.
4. Ternario redundante en `getNodeColor` que indica una refactorización incompleta.
5. Detección de plataforma duplicada (React vs. p5).

Cada task de esta fase es independiente y puede ejecutarse en cualquier orden.

---

## Tasks

### Task 4.1 — Fix del hit-test: radio proporcional a zoom y baseRadius

**Archivo:** `src/components/graph/useGraphInteraction.ts`

**Problema:**
```ts
// Radio de colisión fijo — no escala con zoom ni con el nodo real
if (dx * dx + dy * dy < 18 * 18) return n;
```
Un nodo `Equipo` (baseRadius 7) tiene zona de click más grande que su representación visual.
Un nodo visto con zoom 0.22 resulta casi inatacable.

**Acciones:**
1. Importar `NODE_VISUALS`, `DEFAULT_VISUAL` desde `src/config/visuals.ts`.
2. En la función `hitTest`, calcular el radio de colisión dinámicamente:
   ```ts
   function hitTest(mx, my, nodes, s, canvasW, canvasH): TNode | null {
     const [gx, gy] = toGraph(mx, my, s, canvasW, canvasH)
     for (const n of nodes) {
       const visual = NODE_VISUALS[n.type] ?? DEFAULT_VISUAL
       // El radio de hit es el baseRadius del nodo escalado por zoom,
       // con un mínimo de 10px en pantalla para que nodos pequeños
       // sigan siendo clickeables.
       const hitRadius = Math.max(10 / s.zoom, visual.baseRadius * 1.4)
       const dx = gx - n.x, dy = gy - n.y
       if (dx * dx + dy * dy < hitRadius * hitRadius) return n
     }
     return null
   }
   ```
3. Verificar que nodos de todos los tipos son clickeables en zoom mínimo (0.22) y máximo (3.8).

**Criterio de aceptación:** El radio de click de cada nodo es proporcional a su `baseRadius`
visual. En zoom extremo no hay nodos inatacables.

---

### Task 4.2 — Fix de `waveOff`: hash determinista en vez de Math.random()

**Archivo:** `src/data/adapter.ts` (después de Fase 1) o `src/data/quipus.ts`

**Problema:**
```ts
waveOff: Math.random() * Math.PI * 2
```
Cada vez que se recargan los datos del quipu, las cuerdas reciben nuevos valores y "saltan".

**Acciones:**
1. Crear una función de hash simple en `src/lib/utils.ts` (o en el adaptador):
   ```ts
   /** Hash djb2 — rápido, sin dependencias, suficiente para distribución visual. */
   export function hashString(s: string): number {
     let h = 5381
     for (let i = 0; i < s.length; i++) {
       h = ((h << 5) + h) ^ s.charCodeAt(i)
     }
     return h >>> 0 // unsigned
   }

   export function seededWaveOff(source: string, target: string, predicate: string): number {
     return (hashString(source + ':' + target + ':' + predicate) / 0xFFFFFFFF) * Math.PI * 2
   }
   ```
2. En `buildQuipuGraph` (ahora en `adapter.ts`), reemplazar:
   ```ts
   // Antes
   waveOff: Math.random() * Math.PI * 2

   // Después
   waveOff: seededWaveOff(e.source, e.target, e.predicate)
   ```
3. Hacer lo mismo para `rootEdges` y `areaEdges` usando los IDs sintéticos como semilla.
4. Verificar que las cuerdas no saltan al recargar el mismo quipu.

**Criterio de aceptación:** Cargar el mismo quipu dos veces produce cuerdas con la misma
animación de onda. No hay saltos visuales al cambiar de quipu y volver.

---

### Task 4.3 — Refactorizar `tokens.ts`: eliminar estado global de módulo

**Archivo:** `src/lib/tokens.ts`

**Problema:**
`_areaColors`, `_dynamicVars`, `_nextPaletteIdx` son variables de módulo mutables. `assignAreaColors`
escribe directamente en `document.documentElement.style`. Esto impide testear la asignación
de colores sin el DOM completo y produce bugs potenciales si hay múltiples consumidores.

**Acciones:**
1. Extraer la lógica de asignación de colores a una función pura que devuelve un objeto de colores:
   ```ts
   export interface AreaColorMap {
     cssVars: Record<string, string>          // varName → color CSS
     rgbCache: Record<string, [number, number, number]>  // groupKey → [r,g,b]
   }

   export function computeAreaColors(groups: { key: string }[]): AreaColorMap {
     // sin efectos secundarios, sin tocar el DOM
     ...
   }
   ```
2. Crear una función separada `applyAreaColors(map: AreaColorMap)` que aplique los vars al DOM.
   Esta función tiene el side effect, pero está aislada y puede mockearse fácilmente en tests.
3. En `assignAreaColors` (que puede seguir existiendo como conveniencia), llamar a las dos:
   ```ts
   export function assignAreaColors(groups: { key: string }[]) {
     const map = computeAreaColors(groups)
     applyAreaColors(map)
     // cachear el map para que areaColor() funcione
     _currentMap = map
   }
   ```
4. Ajustar `areaColor()` para leer del map en vez del objeto mutable.

**Criterio de aceptación:** `computeAreaColors` es una función pura testeable sin DOM.
`applyAreaColors` es el único lugar con efectos secundarios en `tokens.ts`.

---

### Task 4.4 — Fix del ternario redundante en `getNodeColor`

**Archivo:** `src/config/visuals.ts`

**Problema:**
```ts
// Ambas ramas son idénticas — refactorización incompleta
const groupKey = n.type === 'AreaHeader' ? n.groupKey : n.groupKey
```

**Acciones:**
1. Investigar si `AreaHeader` debería tener un tratamiento diferente de color.
   - Escenario A: sí — implementar la distinción correcta.
   - Escenario B: no — simplificar a `const groupKey = n.groupKey`.
2. Basado en el comportamiento visual actual (AreaHeader usa el color de su propia área),
   la simplificación correcta es:
   ```ts
   export function getNodeColor(n: TNode): [number, number, number] {
     if (n.groupKey) return areaColor(n.groupKey)
     const fallback = TYPE_COLORS[n.type]
     if (fallback) return hexToRgb(fallback)
     return hexToRgb('#6366f1')
   }
   ```
3. Verificar visualmente que los AreaHeaders siguen con el color de su área.

**Criterio de aceptación:** El ternario redundante no existe. El comportamiento visual es
idéntico al anterior.

---

### Task 4.5 — Unificar detección de plataforma

**Problema:** `isMobile` se calcula dos veces: en `TramaGraph` (React state con MediaQueryList)
y dentro del render de p5 (`w < 768`). Pueden divergir si el canvas no es full-viewport.

**Acciones:**
1. En `useQuipuSession` (o en `TramaGraph`), exponer `isMobile: boolean` como un valor estable.
2. Pasar `isMobile` al canvas a través de `P5CanvasConfig` (definido en Fase 3):
   ```ts
   export interface P5CanvasConfig {
     // ...existentes...
     isMobile: boolean
   }
   ```
3. Dentro de p5, usar `config.isMobile` en vez de `w < 768` para las decisiones de layout
   del intro (texto en 3 líneas vs. 2 líneas, posición del CTA).
4. Eliminar la comprobación `const isMobile = w < 768` del render loop de p5.

**Criterio de aceptación:** Solo hay una fuente de verdad para `isMobile`. El render del
intro en p5 es consistente con el layout de React.

---

## Checklist de cierre de fase

- [ ] Task 4.1 completa — hit-test con radio dinámico
- [ ] Task 4.2 completa — waveOff determinista, sin saltos visuales
- [ ] Task 4.3 completa — `computeAreaColors` es función pura
- [ ] Task 4.4 completa — ternario redundante eliminado
- [ ] Task 4.5 completa — `isMobile` tiene una sola fuente de verdad
- [ ] `pnpm build` pasa sin warnings

---

## Issue

```
Title: [Fase 4] Correcciones micro — bugs de UX y deuda técnica

## Contexto

Una vez completadas las fases de arquitectura (1, 2, 3), quedan cinco correcciones
concretas que son independientes entre sí y pueden ejecutarse en cualquier orden.

## Tasks

- [ ] 4.1 Hit-test: radio proporcional a zoom y baseRadius del nodo
- [ ] 4.2 waveOff: hash determinista (djb2) en vez de Math.random()
- [ ] 4.3 tokens.ts: extraer computeAreaColors como función pura sin side effects
- [ ] 4.4 getNodeColor: eliminar ternario redundante
- [ ] 4.5 isMobile: unificar en una sola fuente de verdad (React → p5 via config)

## Definition of Done

- Todos los nodos son clickeables en zoom mínimo (0.22).
- Recargar el mismo quipu no produce saltos en las cuerdas.
- computeAreaColors testeable sin DOM.
- pnpm build limpio.

## Prerequisitos

- Task 4.2 requiere que Fase 1 esté completa (adapter.ts existe).
- Task 4.5 requiere que Fase 3 esté completa (P5CanvasConfig existe).
- Las demás son independientes.

## Referencias

Ver docs/roadmap/04-micro-fixes.md
```
