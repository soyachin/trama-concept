# Fase 1 — Capa de dominio y datos

> **Prioridad:** 🔴 Crítica  
> **Prerequisito de:** Fases 2, 3, 5  
> **Prerequisitos:** ninguno  
> **Estimación:** 3–5 sesiones de agente

---

## Problema que resuelve

`src/data/quipus.ts` hace tres cosas a la vez:

1. Define los contratos de API (`ApiNode`, `ApiQuipuGraph`) — debería generarse automáticamente.
2. Implementa la transformación al modelo interno (`buildQuipuGraph`) — lógica de dominio.
3. Contiene el fallback de desarrollo (`getDummyQuipuGraph`) — datos de fixture.

Cualquier cambio en el backend toca el mismo archivo que cualquier cambio en el layout del grafo.
El breaking change `camelCase → snake_case` ya ocurrió sin que el compilador lo detectara porque
el frontend no tiene ningún contrato verificado contra el schema real del backend.

---

## Goal de la fase

Al terminar esta fase:

- Los tipos `ApiNode`, `ApiQuipuGraph` (y todos los tipos de respuesta del backend) se generan
  automáticamente desde el OpenAPI schema del backend y viven en `src/generated/api.ts`.
- Existe una capa de adaptación explícita `src/data/adapter.ts` que traduce del modelo de API
  al modelo interno. Es la única pieza del frontend que conoce los nombres de campo del backend.
- `getDummyQuipuGraph` es reemplazado por un fixture JSON estático que el adaptador puede
  procesar igual que una respuesta real.
- `src/data/quipus.ts` solo contiene las funciones de fetch y re-exporta los tipos del modelo interno.

---

## Estructura de archivos objetivo

```
src/
  generated/
    api.ts          ← generado por openapi-typescript, NO editar a mano
  data/
    adapter.ts      ← única frontera entre modelo API y modelo interno
    quipus.ts       ← solo fetch: fetchQuipus(), fetchQuipuGraph()
    fixtures/
      quipu-social.json   ← fixture estático (reemplaza getDummyQuipuGraph)
  types/
    graph.ts        ← modelo interno: TNode, TEdge, QuipuGraph, etc. (sin cambios)
```

---

## Tasks

### Task 1.1 — Aplicar el breaking change pendiente

**Contexto:** El backend ya migró a `snake_case`. El frontend todavía usa `camelCase` en sus
interfaces `Api*`. Esto es un bug en producción.

**Acciones:**
1. En `src/data/quipus.ts`, renombrar en las interfaces:
   - `ApiNode.groupKey` → `ApiNode.group_key`
   - `ApiQuipuGraph.groupBy` → `ApiQuipuGraph.group_by`
2. En `buildQuipuGraph`, actualizar todas las lecturas:
   - `n.groupKey` → `n.group_key`
   - `data.groupBy` → `data.group_by`
3. En `getDummyQuipuGraph`, actualizar el objeto dummy hardcodeado:
   - `groupKey:` → `group_key:`
   - `groupBy:` → `group_by:`
4. Verificar que `pnpm build` pasa sin errores.

**Criterio de aceptación:** `pnpm build` limpio. El grafo carga correctamente contra el backend
con los nuevos nombres.

---

### Task 1.2 — Instalar y configurar `openapi-typescript`

**Contexto:** En lugar de escribir interfaces `Api*` a mano, las vamos a generar desde el
schema OpenAPI del backend (FastAPI expone `/openapi.json`).

**Acciones:**
1. Instalar como devDependency: `pnpm add -D openapi-typescript`.
2. Agregar script en `package.json`:
   ```json
   "generate:api": "openapi-typescript http://localhost:8000/openapi.json -o src/generated/api.ts"
   ```
3. Agregar `src/generated/` a `.gitignore` con un comentario explicativo, O decidir commitear
   el archivo generado para que CI no necesite el backend corriendo (recomendado para este proyecto:
   commitear y regenerar manualmente al cambiar el backend).
4. Ejecutar `pnpm generate:api` contra el backend corriendo y verificar que el archivo generado
   incluye los tipos de `QuipuGraph`, `Node`, `Edge`.
5. Agregar `src/generated/api.ts` al repo con un header de advertencia:
   ```ts
   // ESTE ARCHIVO ES GENERADO AUTOMÁTICAMENTE.
   // No editar a mano. Ejecutar: pnpm generate:api
   ```

**Criterio de aceptación:** `src/generated/api.ts` existe en el repo y contiene tipos que
corresponden a los response models del backend.

---

### Task 1.3 — Crear `src/data/adapter.ts`

**Contexto:** Este módulo es la única pieza del frontend que puede importar de `src/generated/`.
Todo lo demás del frontend trabaja con el modelo interno (`TNode`, `TEdge`, `QuipuGraph`).

**Acciones:**
1. Crear `src/data/adapter.ts`.
2. Mover `buildQuipuGraph` de `quipus.ts` a `adapter.ts`.
3. Actualizar la firma para recibir el tipo generado en vez de la interfaz manual:
   ```ts
   import type { components } from '../generated/api'
   type ApiQuipuGraph = components['schemas']['QuipuGraph']

   export function adaptQuipuGraph(raw: ApiQuipuGraph): QuipuGraph { ... }
   ```
4. Eliminar las interfaces `ApiNode`, `ApiEdge`, `ApiQuipuGraph` de `quipus.ts`.
5. En `quipus.ts`, llamar a `adaptQuipuGraph` después del fetch:
   ```ts
   const raw = await res.json()
   return adaptQuipuGraph(raw)
   ```
6. Verificar que `pnpm build` pasa.

**Criterio de aceptación:** No existe ninguna interfaz `Api*` escrita a mano en el frontend.
El adaptador es el único archivo que importa de `src/generated/`.

---

### Task 1.4 — Reemplazar `getDummyQuipuGraph` con un fixture JSON

**Contexto:** `getDummyQuipuGraph` construye datos de desarrollo programáticamente, usando la
misma forma que la respuesta de API. Esto acopla los datos de desarrollo con el formato de API.
Un fixture JSON estático es más robusto: puede validarse contra el schema generado y puede
editarse sin tocar código.

**Acciones:**
1. Ejecutar la app en desarrollo, interceptar la respuesta de `/quipus/quipu-social/graph` y
   guardarla como `src/data/fixtures/quipu-social.json`. Si el backend no está disponible,
   construir el JSON a mano con la forma del schema generado (snake_case).
2. En `quipus.ts`, reemplazar la llamada a `getDummyQuipuGraph()` en el bloque `catch`:
   ```ts
   import rawFixture from './fixtures/quipu-social.json'
   // ...
   } catch {
     return adaptQuipuGraph(rawFixture)
   }
   ```
3. Eliminar la función `getDummyQuipuGraph` y su export.
4. Agregar `"resolveJsonModule": true` al `tsconfig.app.json` si no está.
5. Verificar que la app carga en desarrollo sin backend.

**Criterio de aceptación:** `getDummyQuipuGraph` no existe en el codebase. La app carga con
datos de fallback sin backend corriendo.

---

### Task 1.5 — Limpiar `QuipuGraph` del modelo interno

**Contexto:** Ahora que el adaptador es responsable de la transformación, el modelo interno
puede ser más limpio. `QuipuGraph` actualmente tiene `groupBy: string | null` que es un detalle
del API. En el modelo interno, el concepto es `groups` con sus claves.

**Acciones:**
1. Revisar si `groupBy` se usa en algún componente o hook fuera del adaptador.
2. Si no se usa (actualmente no hay ningún componente que lo lea), eliminarlo de `QuipuGraph`.
3. Si se usa, renombrarlo a algo semánticamente del dominio (por ejemplo `groupingDimension`).
4. Verificar que `pnpm build` pasa.

**Criterio de aceptación:** El modelo interno (`src/types/graph.ts`) no tiene ningún nombre de
campo que sea un calco del nombre de campo del API.

---

## Checklist de cierre de fase

- [ ] Task 1.1 completa — breaking change aplicado, build limpio
- [ ] Task 1.2 completa — `pnpm generate:api` funciona, archivo commiteado
- [ ] Task 1.3 completa — adaptador existe, no hay interfaces `Api*` manuales
- [ ] Task 1.4 completa — fixture JSON existe, `getDummyQuipuGraph` eliminado
- [ ] Task 1.5 completa — modelo interno sin nombres de campo de API
- [ ] `pnpm build` pasa sin warnings en strict mode
- [ ] No hay imports de `src/generated/` fuera de `src/data/adapter.ts`

---

## Issue

```
Title: [Fase 1] Capa de dominio y datos

## Problema

`src/data/quipus.ts` mezcla tres responsabilidades: contratos de API, transformación al
modelo interno y datos de fixture de desarrollo. El resultado es que un cambio en el
backend (ya ocurrió: camelCase → snake_case) no produce error de compilación y llega
silenciosamente a producción.

## Objetivo

Crear una frontera explícita entre el modelo del backend y el modelo interno del frontend.

## Tasks

- [ ] 1.1 Aplicar breaking change pendiente (group_key, group_by)
- [ ] 1.2 Instalar openapi-typescript y agregar script generate:api
- [ ] 1.3 Crear src/data/adapter.ts — única frontera con el API generado
- [ ] 1.4 Reemplazar getDummyQuipuGraph con fixture JSON estático
- [ ] 1.5 Limpiar modelo interno de nombres de campo de API

## Definition of Done

- Las interfaces Api* existen únicamente en adapter.ts y en ningún otro archivo de src/.
- src/generated/api.ts está en el repo con header de advertencia (no aplica: repos separados, sin openapi-typescript).
- getDummyQuipuGraph no existe en el codebase.
- pnpm build pasa sin warnings.

## Impacto en otras fases

Fase 2 y Fase 3 dependen de esta. Fase 5 (CI) necesita el script generate:api.

## Referencias

Ver docs/roadmap/01-domain-layer.md
```
