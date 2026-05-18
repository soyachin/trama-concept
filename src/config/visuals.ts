import type { NodeVisual, EdgeVisual } from '../types/graph'

export const BG   = '#0f0e0b'
export const FG   = '#f0ede4'
export const ACC  = '#c8753a'

export const NODE_VISUALS: Record<string, NodeVisual> = {
  'Root':                  { ditherDensity: 0,    baseRadius: 0,  noiseAmp: 0,    noiseFreq: 0,    scaleX: 1.00, scaleY: 1.00 },
  'AreaHeader':            { ditherDensity: 0.62, baseRadius: 15, noiseAmp: 0.18, noiseFreq: 0.55, scaleX: 1.00, scaleY: 1.00 },
  'OrganizacionEstudiantil':{ditherDensity: 0.60, baseRadius: 13, noiseAmp: 0.24, noiseFreq: 0.65, scaleX: 1.00, scaleY: 1.00 },
  'Club':                  { ditherDensity: 0.55, baseRadius: 12, noiseAmp: 0.26, noiseFreq: 0.70, scaleX: 1.00, scaleY: 1.00 },
  'Actividad':             { ditherDensity: 0.40, baseRadius: 9,  noiseAmp: 0.18, noiseFreq: 0.90, scaleX: 1.10, scaleY: 0.85 },
  'Curso':                 { ditherDensity: 0.38, baseRadius: 11, noiseAmp: 0.32, noiseFreq: 1.20, scaleX: 1.00, scaleY: 0.75 },
  'Docente':               { ditherDensity: 0.18, baseRadius: 10, noiseAmp: 0.42, noiseFreq: 1.50, scaleX: 1.00, scaleY: 1.00 },
  'Proyecto':              { ditherDensity: 0.44, baseRadius: 9,  noiseAmp: 0.16, noiseFreq: 0.80, scaleX: 1.35, scaleY: 0.70 },
  'Laboratorio':           { ditherDensity: 0.50, baseRadius: 12, noiseAmp: 0.18, noiseFreq: 0.90, scaleX: 1.10, scaleY: 0.90 },
  'Equipo':                { ditherDensity: 0.30, baseRadius: 7,  noiseAmp: 0.10, noiseFreq: 1.00, scaleX: 1.00, scaleY: 1.00 },
  'Carrera':               { ditherDensity: 0.55, baseRadius: 14, noiseAmp: 0.20, noiseFreq: 0.50, scaleX: 1.00, scaleY: 1.00 },
  'Departamento':          { ditherDensity: 0.45, baseRadius: 13, noiseAmp: 0.15, noiseFreq: 0.60, scaleX: 1.00, scaleY: 1.00 },
  'GrupoInvestigacion':    { ditherDensity: 0.40, baseRadius: 11, noiseAmp: 0.20, noiseFreq: 0.70, scaleX: 1.00, scaleY: 1.00 },
}
export const DEFAULT_VISUAL: NodeVisual = { ditherDensity: 0.40, baseRadius: 10, noiseAmp: 0.20, noiseFreq: 0.80, scaleX: 1.00, scaleY: 1.00 }

export const TYPE_COLORS: Record<string, string> = {
  'Root':                   '#f0ede4',
  'AreaHeader':             '#c8753a',
  'OrganizacionEstudiantil':'#6366f1',
  'Club':                   '#a78bfa',
  'Actividad':              '#f59e0b',
  'Curso':                  '#22c55e',
  'Docente':                '#f59e0b',
  'Proyecto':               '#ef4444',
  'Laboratorio':            '#06b6d4',
  'Equipo':                 '#8b5cf6',
  'Carrera':                '#ec4899',
  'Departamento':           '#14b8a6',
  'GrupoInvestigacion':     '#f97316',
}

export interface RopeConfig {
  strands: number
  spread: number
  weight: number
  twist: number
}

export const ROPE_CONFIGS: Record<string, RopeConfig> = {
  // Quipu social
  alianzaCon:    { strands: 3, spread: 2.8, weight: 1.2, twist: 0.8 },
  organizadoPor: { strands: 3, spread: 2.4, weight: 1.1, twist: 0.7 },
  coorganizadoPor:{strands: 2, spread: 2.0, weight: 0.9, twist: 0.5 },
  asesoradoPor:  { strands: 2, spread: 1.8, weight: 0.8, twist: 0.3 },
  // Cuerdas estructurales del quipu (raíz → área → nodo).
  quipu:         { strands: 4, spread: 3.0, weight: 1.3, twist: 0.6 },
  perteneceArea: { strands: 2, spread: 1.6, weight: 0.7, twist: 0.3 },
  // Legacy (otros quipus, deprecan cuando salgan los suyos).
  usaContenidoDe:{ strands: 2, spread: 1.6, weight: 0.7, twist: 0.4 },
  dictadoPor:    { strands: 2, spread: 2.0, weight: 0.9, twist: 0.5 },
  perteneceA:    { strands: 2, spread: 1.8, weight: 0.8, twist: 0.3 },
  prerequisitoDe:{ strands: 1, spread: 0,   weight: 0.8, twist: 0   },
  miembroDe:     { strands: 3, spread: 2.2, weight: 1.0, twist: 0.6 },
  investigaEn:   { strands: 3, spread: 2.2, weight: 1.0, twist: 0.6 },
  participaEn:   { strands: 4, spread: 3.5, weight: 1.4, twist: 1.0 },
  ubicadoEn:     { strands: 1, spread: 0,   weight: 0.6, twist: 0   },
}

export const EDGE_VISUALS: Record<string, EdgeVisual> = {
  alianzaCon:     { weight: 1.4, dash: [10, 6]       },
  organizadoPor:  { weight: 1.2, dash: []             },
  coorganizadoPor:{ weight: 1.0, dash: [6, 4]        },
  asesoradoPor:   { weight: 0.8, dash: [4, 4]        },
  quipu:          { weight: 1.3, dash: []             },
  perteneceArea:  { weight: 0.7, dash: []             },
  usaContenidoDe: { weight: 0.7, dash: [2,  5]       },
  dictadoPor:     { weight: 0.9, dash: []             },
  perteneceA:     { weight: 0.8, dash: [6, 3]        },
  prerequisitoDe: { weight: 0.7, dash: [6, 3, 1, 3]  },
  miembroDe:      { weight: 1.0, dash: []             },
  investigaEn:    { weight: 1.0, dash: []             },
  participaEn:    { weight: 1.4, dash: []             },
  ubicadoEn:      { weight: 0.6, dash: [3, 4]        },
}

export const BAYER: number[][] = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
].map(r => r.map(v => v / 16))

export const RELATIONAL_PREDICATES = [
  'alianzaCon', 'organizadoPor', 'coorganizadoPor', 'asesoradoPor',
  'usaContenidoDe', 'dictadoPor', 'perteneceA',
  'prerequisitoDe', 'miembroDe', 'investigaEn', 'participaEn', 'ubicadoEn',
]

// Predicados estructurales del quipu (no son relaciones RDF reales; conectan
// nodos sintéticos como raíz y nudos cabecera de área).
export const STRUCTURAL_PREDICATES = ['quipu', 'perteneceArea']
