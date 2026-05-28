# Estructura del proyecto

```
.
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI: lint, type-check, test, build
├── config/
│   ├── eslint.config.js              # Configuración de ESLint (flat config)
│   ├── renovate.json                 # Configuración de Renovate (dependencias)
│   ├── tsconfig.json                 # Project references (apunta a app + node)
│   ├── tsconfig.app.json             # TypeScript config para src/ (strict mode)
│   └── tsconfig.node.json            # TypeScript config para vite.config.ts
├── docs/
│   ├── architecture/
│   │   ├── data-flow.md              # Flujo de datos React ↔ p5
│   │   ├── domain-model.md           # Modelo de dominio (TNode, TEdge, QuipuGraph, ...)
│   │   └── file-structure.md         # Este archivo
│   └── roadmap/
│       └── *.md                      # Planificación de fases de desarrollo
├── public/                           # Assets públicos (favicons, manifest)
├── src/
│   ├── assets/
│   │   └── fonts/                    # Fuentes tipográficas (PicNic, Scorpius, SpaceNotorious)
│   ├── components/
│   │   ├── desktop/                  # Componentes de layout en pantallas grandes
│   │   ├── graph/                    # Componente principal del grafo + simulación p5
│   │   ├── mobile/                   # Componentes de layout en pantallas móviles
│   │   └── ui/                       # Componentes UI compartidos
│   ├── config/
│   │   ├── typography.ts             # Estilos tipográficos semánticos y roles de color
│   │   └── visuals.ts                # Config de nodos, cuerdas, colores, BAYER dithering
│   ├── data/
│   │   ├── fixtures/                 # Datos dummy para desarrollo sin backend
│   │   ├── __tests__/                # Tests de contrato del adaptador
│   │   ├── adapter.ts                # Transformación API → QuipuGraph (+ enrichNode)
│   │   └── quipus.ts                 # Fetch de quipus desde la API
│   ├── hooks/
│   │   └── useQuipuSession.ts        # Hook principal: carga de datos, sesión, enrich
│   ├── lib/
│   │   ├── __tests__/                # Tests de utilidades (hash, waveOff)
│   │   ├── layout.ts                 # Posicionamiento inicial de nodos (quipu + legacy)
│   │   ├── render.ts                 # Renderizado canvas: cuerdas, nudos, viewport culling
│   │   ├── tokens.ts                 # Resolución cacheada de CSS custom properties
│   │   └── utils.ts                  # hashString djb2 + seededWaveOff determinista
│   ├── styles/
│   │   └── tokens.css                # CSS custom properties (colores, fuentes, sombras)
│   ├── types/
│   │   └── graph.ts                  # Tipos del dominio: TNode, TEdge, QuipuGraph, ...
│   ├── App.tsx                       # Componente raíz
│   ├── index.css                     # Estilos globales
│   ├── main.tsx                      # Entry point (refreshTokens + render)
│   └── vite-env.d.ts                 # Declaraciones de tipos de Vite
├── index.html                        # Template HTML de Vite
├── vite.config.ts                    # Configuración de Vite + Vitest
├── package.json
├── pnpm-lock.yaml
└── README.md
```

## Convenciones de directorios

| Directorio | Propósito |
|-----------|----------|
| `src/components/graph/` | Componente principal del grafo + loop de render p5 + simulación d3. Es el núcleo del frontend. |
| `src/components/{desktop,mobile}/` | Layouts responsivos. Misma lógica de UI, diferente disposición según viewport. |
| `src/components/ui/` | Componentes React reutilizables (QuipuSelector, etc.). |
| `src/config/` | Configuración declarativa: colores, geometrías de nudos, config de cuerdas, tipografía. Sin lógica de negocio. |
| `src/data/` | Capa de acceso a datos: fetch de API, adaptación de respuestas, fixtures de fallback. |
| `src/hooks/` | Hooks React con lógica de estado (carga de sesión, enrich de nodos). |
| `src/lib/` | Funciones puras sin dependencia de React: layout, renderizado canvas, utilidades. |
| `src/types/` | Interfaces TypeScript del dominio. Sin imports de runtime. |
| `src/styles/` | CSS custom properties usadas tanto por React (var()) como por canvas (refreshTokens). |
| `config/` | Configuración de tooling (TypeScript, ESLint, Renovate). No es código de aplicación. |
| `docs/` | Documentación de arquitectura y roadmap. No es código. |
