# Trama — Roadmap de Refactorización

> Documento maestro. Cada fase tiene su propio archivo de detalle.

---

## Contexto

El proyecto creció a partir de un prototipo canvas-first (p5 + d3-force) al que se le fue
agregando UI de React encima. El resultado es una app funcional pero sin un modelo de dominio
explícito separado del rendering. Los tres problemas macro que este roadmap ataca son:

1. **Dos motores de rendering sin protocolo** — React y p5 comparten estado mutable por referencia.
2. **Capa de datos inexistente** — fetch, transformación y datos dummy conviven en un solo archivo.
3. **Ciclo de vida de quipu no modelado** — el estado de sesión está distribuido entre tres módulos sin responsable claro.

Los problemas micro (breaking change camelCase→snake_case, hit-test, waveOff, etc.) son
consecuencia directa de estos tres y se resuelven naturalmente al atacar la arquitectura.

---

## Fases

| Fase | Nombre | Archivo | Prioridad |
|------|--------|---------|-----------|
| 0 | Este documento | `00-roadmap-overview.md` | — |
| 1 | Capa de dominio y datos | `01-domain-layer.md` | 🔴 Crítica |
| 2 | Modelo de sesión de quipu | `02-quipu-session.md` | 🔴 Crítica |
| 3 | Protocolo React ↔ p5 | `03-react-p5-protocol.md` | 🟠 Alta |
| 4 | Correcciones micro | `04-micro-fixes.md` | 🟡 Media |
| 5 | Infraestructura y CI | `05-infra-ci.md` | 🟡 Media |

---

## Orden de ejecución recomendado

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5
```

Las fases 1 y 2 son prerequisitos de la 3. La fase 4 puede ejecutarse en paralelo con la 3
una vez completada la fase 1. La fase 5 puede iniciarse desde el principio pero algunos steps
(generación de tipos desde OpenAPI) requieren que la fase 1 esté completa.

---

## Principios que guían cada decisión

- **Un solo dueño por cada pieza de estado.** Si dos módulos necesitan el mismo valor, uno lo
  posee y el otro lo lee.
- **El modelo de dominio no conoce la tecnología de rendering.** Los tipos `Quipu`, `Graph`,
  `ExplorationSession` deben poder existir en un test sin montar p5 ni React.
- **Los contratos con el backend son generados, no escritos a mano.** Ninguna interfaz `Api*`
  se escribe en el frontend; se genera desde el OpenAPI schema del backend.
- **Cada fase deja el código compilando y los tests pasando.** No hay commits rotos en el camino.
