import type { NodeVisual, EdgeVisual } from '../types/graph'

export const BG   = '#0f0e0b'
export const FG   = '#f0ede4'
export const ACC  = '#c8753a'

export const NODE_VISUALS: Record<string, NodeVisual> = {
  'Club':              { ditherDensity: 0.60, baseRadius: 13, noiseAmp: 0.24, noiseFreq: 0.65, scaleX: 1.00, scaleY: 1.00 },
  'Curso':             { ditherDensity: 0.38, baseRadius: 11, noiseAmp: 0.32, noiseFreq: 1.20, scaleX: 1.00, scaleY: 0.75 },
  'Docente':           { ditherDensity: 0.18, baseRadius: 10, noiseAmp: 0.42, noiseFreq: 1.50, scaleX: 1.00, scaleY: 1.00 },
  'Proyecto':          { ditherDensity: 0.44, baseRadius: 9,  noiseAmp: 0.16, noiseFreq: 0.80, scaleX: 1.35, scaleY: 0.70 },
  'Laboratorio':       { ditherDensity: 0.50, baseRadius: 12, noiseAmp: 0.18, noiseFreq: 0.90, scaleX: 1.10, scaleY: 0.90 },
  'Equipo':            { ditherDensity: 0.30, baseRadius: 7,  noiseAmp: 0.10, noiseFreq: 1.00, scaleX: 1.00, scaleY: 1.00 },
  'Carrera':           { ditherDensity: 0.55, baseRadius: 14, noiseAmp: 0.20, noiseFreq: 0.50, scaleX: 1.00, scaleY: 1.00 },
  'Departamento':      { ditherDensity: 0.45, baseRadius: 13, noiseAmp: 0.15, noiseFreq: 0.60, scaleX: 1.00, scaleY: 1.00 },
  'GrupoInvestigacion':{ ditherDensity: 0.40, baseRadius: 11, noiseAmp: 0.20, noiseFreq: 0.70, scaleX: 1.00, scaleY: 1.00 },
}
export const DEFAULT_VISUAL: NodeVisual = { ditherDensity: 0.40, baseRadius: 10, noiseAmp: 0.20, noiseFreq: 0.80, scaleX: 1.00, scaleY: 1.00 }

export const TYPE_COLORS: Record<string, string> = {
  'Club':              '#6366f1',
  'Curso':             '#22c55e',
  'Docente':           '#f59e0b',
  'Proyecto':          '#ef4444',
  'Laboratorio':       '#06b6d4',
  'Equipo':            '#8b5cf6',
  'Carrera':           '#ec4899',
  'Departamento':      '#14b8a6',
  'GrupoInvestigacion':'#f97316',
}

export interface RopeConfig {
  strands: number
  spread: number
  weight: number
  twist: number
}

export const ROPE_CONFIGS: Record<string, RopeConfig> = {
  alianzaCon:    { strands: 3, spread: 2.8, weight: 1.2, twist: 0.8 },
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
  'alianzaCon', 'usaContenidoDe', 'dictadoPor', 'perteneceA',
  'prerequisitoDe', 'miembroDe', 'investigaEn', 'participaEn', 'ubicadoEn',
]
