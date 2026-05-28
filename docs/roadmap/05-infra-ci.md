# Fase 5 — Infraestructura y CI

> **Prioridad:** 🟡 Media  
> **Prerequisito de:** (ninguno, es hoja)  
> **Prerequisitos:** Fase 1 (para el step de generación de tipos). Las demás tasks pueden ejecutarse antes.  
> **Estimación:** 2–3 sesiones de agente

---

## Problema que resuelve

El CI actual solo corre lint y build. No hay ninguna red de seguridad que detecte:

- Drift entre el schema del backend y los tipos del frontend.
- Regresiones de comportamiento al refactorizar.
- Código muerto o imports rotos en TypeScript strict mode.

Además, hay dos problemas de organización del repo:

- El directorio `config/` raíz con un `vite.config.ts` shim es confuso.
- No hay documentación de arquitectura que sobreviva al onboarding.

---

## Goal de la fase

Al terminar esta fase:

- CI detecta automáticamente si el schema del backend cambió y los tipos del frontend no
  fueron regenerados.
- TypeScript corre en strict mode y sin `any` implícitos.
- Los tests de contrato del backend tienen su equivalente en el frontend.
- La organización del repo es clara para un contribuidor nuevo.

---

## Tasks

### Task 5.1 — Activar TypeScript strict mode

**Archivos:** `config/tsconfig.app.json`, `config/tsconfig.node.json`

**Acciones:**
1. En `config/tsconfig.app.json`, agregar o verificar:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "noImplicitReturns": true,
       "exactOptionalPropertyTypes": true
     }
   }
   ```
2. Correr `pnpm build` y resolver todos los errores que aparezcan.
   Los errores más comunes esperados:
   - Accesos a arrays sin verificar `undefined` (resuelto con `??` o guardas).
   - `any` implícitos en el render loop de p5 (ya hay algunos explícitos en el código).
   - Propiedades opcionales tratadas como requeridas.
3. No suprimir errores con `// @ts-ignore` — resolverlos correctamente.

**Criterio de aceptación:** `pnpm build` pasa con `strict: true` sin ningún `@ts-ignore`
ni `as any` que no estuviera antes.

---

### Task 5.2 — Agregar step de type-check al CI

**Archivo:** `.github/workflows/ci.yml`

**Contexto:** Actualmente el CI corre `pnpm build` que incluye `tsc -b`. Pero si en algún
momento se añade `skipLibCheck: true` o se excluye algún archivo del build, el type-check
puede silenciarse. El step explícito garantiza que siempre corre.

**Acciones:**
1. Agregar un step dedicado de type-check en `ci.yml`:
   ```yaml
   - name: Type check
     run: pnpm exec tsc --noEmit -p config/tsconfig.app.json
   ```
2. Agregar un step de verificación del archivo generado (requiere Fase 1):
   ```yaml
   - name: Verify generated API types are up to date
     run: |
       pnpm generate:api --output /tmp/api-check.ts
       diff src/generated/api.ts /tmp/api-check.ts || \
         (echo "❌ Los tipos generados están desactualizados. Ejecuta pnpm generate:api" && exit 1)
   ```
   **Nota:** Este step requiere que el backend esté disponible en CI, o que el schema OpenAPI
   esté commiteado como `openapi.json` en el repo. La opción recomendada es commitear el schema:
   ```yaml
   - name: Verify generated API types are up to date
     run: |
       pnpm exec openapi-typescript openapi.json -o /tmp/api-check.ts
       diff src/generated/api.ts /tmp/api-check.ts || \
         (echo "❌ Regenerar con pnpm generate:api" && exit 1)
   ```
3. Agregar un script `export:schema` en el backend que copie el `openapi.json` al repo del
   frontend, o documentar el proceso manual de sincronización.

**Criterio de aceptación:** CI falla si `src/generated/api.ts` no corresponde al schema
commiteado. El error es legible y explica qué comando correr.

---

### Task 5.3 — Agregar tests de contrato del lado frontend

**Contexto:** El backend tiene `test_contracts.py` con 15 tests que verifican que los
response models corresponden a los endpoints. El frontend no tiene nada equivalente.

**Herramienta recomendada:** Vitest (compatible con Vite, sin configuración extra).

**Acciones:**
1. Instalar Vitest: `pnpm add -D vitest @vitest/ui jsdom`.
2. Agregar configuración en `config/vite.config.ts`:
   ```ts
   export default defineConfig({
     plugins: [react()],
     test: {
       environment: 'jsdom',
       globals: true,
     },
   })
   ```
3. Agregar script en `package.json`: `"test": "vitest run"`.
4. Crear `src/data/__tests__/adapter.test.ts` con tests que verifican:
   - `adaptQuipuGraph` con un fixture válido produce un `QuipuGraph` correcto.
   - El nodo raíz sintético se genera correctamente.
   - Los AreaHeaders se generan uno por grupo.
   - Las edges sintéticas (root→area, area→nodo) se generan correctamente.
   - Un fixture con `group_key: null` no genera AreaEdge para ese nodo.
5. Crear `src/lib/__tests__/utils.test.ts` con tests de `hashString` y `seededWaveOff`
   (determinismo: misma entrada → mismo output).
6. Agregar step en CI:
   ```yaml
   - name: Test
     run: pnpm test
   ```

**Criterio de aceptación:** Al menos 8 tests que cubren el adaptador y las utilidades.
CI falla si algún test falla. Los tests no requieren backend ni DOM completo para correr.

---

### Task 5.4 — Eliminar el shim `vite.config.ts` de la raíz

**Problema:** Hay dos archivos de configuración de Vite: `vite.config.ts` en la raíz (que
solo re-exporta) y `config/vite.config.ts` (el real). La indirección no aporta nada.

**Acciones:**
1. Verificar que nada depende del path `./vite.config.ts` de la raíz (scripts, CI, etc.).
2. Mover el contenido de `config/vite.config.ts` directamente a `vite.config.ts` en la raíz.
3. Eliminar `config/vite.config.ts`.
4. Actualizar `config/tsconfig.node.json` si referenciaba el path del archivo.
5. Verificar que `pnpm dev` y `pnpm build` siguen funcionando.

**Criterio de aceptación:** Solo existe un `vite.config.ts` en el proyecto (en la raíz).

---

### Task 5.5 — Crear documentación de arquitectura

**Acciones:**
1. Crear `docs/architecture/` con los siguientes archivos:
   - `data-flow.md` — el diagrama de flujo React ↔ p5 (creado en Fase 3, Task 3.4).
   - `domain-model.md` — describe `TNode`, `TEdge`, `QuipuGraph`, `ExplorationSession` y sus
     relaciones. Incluye qué es un quipu "social" vs. otros quipus futuros.
   - `file-structure.md` — mapa del repo con una línea de descripción por directorio.
2. Mover los archivos del roadmap a `docs/roadmap/` dentro del repo.
3. Agregar una sección `## Architecture` en el `README.md` principal que apunte a `docs/architecture/`.

**Criterio de aceptación:** Un contribuidor nuevo puede entender la arquitectura leyendo solo
`docs/architecture/data-flow.md` y `docs/architecture/domain-model.md`.

---

## Checklist de cierre de fase

- [ ] Task 5.1 completa — TypeScript strict mode sin errores
- [ ] Task 5.2 completa — CI detecta drift de schema generado
- [ ] Task 5.3 completa — Vitest instalado, ≥8 tests, CI corre tests
- [ ] Task 5.4 completa — un solo `vite.config.ts`
- [ ] Task 5.5 completa — documentación de arquitectura en `docs/`
- [ ] CI verde en main con todos los steps nuevos
- [ ] `pnpm build` pasa en strict mode

---

## Issue

```
Title: [Fase 5] Infraestructura y CI

## Problema

El CI solo hace lint + build. No hay red de seguridad para drift de schema
entre backend y frontend, ni para regresiones de comportamiento al refactorizar.
TypeScript no corre en strict mode. No hay documentación de arquitectura.

## Tasks

- [ ] 5.1 Activar TypeScript strict mode — resolver todos los errores resultantes
- [ ] 5.2 CI: agregar step de verificación de tipos generados (openapi drift)
- [ ] 5.3 Instalar Vitest y agregar tests de contrato del adaptador (≥8 tests)
- [ ] 5.4 Eliminar shim vite.config.ts de la raíz
- [ ] 5.5 Crear docs/architecture/ con data-flow, domain-model y file-structure

## Definition of Done

- CI tiene 4 steps: lint, type-check, test, build — todos verdes en main.
- CI falla si src/generated/api.ts está desactualizado respecto al schema commiteado.
- pnpm build en strict mode sin @ts-ignore ni as any nuevos.
- docs/architecture/ existe con los tres archivos.

## Prerequisitos

- Task 5.2 requiere Fase 1 (generate:api existe).
- Task 5.3 puede comenzar en paralelo con las demás fases.
- Task 5.5 Task 3.4 debe estar completa (data-flow diagram).

## Referencias

Ver docs/roadmap/05-infra-ci.md
```
