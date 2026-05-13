import type { NodeVisual, EdgeVisual } from '../types/graph'

export const BG   = '#0f0e0b'
export const FG   = '#f0ede4'
export const ACC  = '#c8753a'

export const NODE_VISUALS: Record<string, NodeVisual> = {
  'trama:Club':    { ditherDensity: 0.60, baseRadius: 60, noiseAmp: 0.24, noiseFreq: 0.65, scaleX: 1.00, scaleY: 1.00 },
  'trama:Curso':   { ditherDensity: 0.38, baseRadius: 44, noiseAmp: 0.32, noiseFreq: 1.20, scaleX: 1.00, scaleY: 1.00 },
  'trama:Docente': { ditherDensity: 0.18, baseRadius: 40, noiseAmp: 0.42, noiseFreq: 1.50, scaleX: 1.00, scaleY: 1.00 },
  'trama:Tesis':   { ditherDensity: 0.44, baseRadius: 48, noiseAmp: 0.16, noiseFreq: 0.80, scaleX: 1.40, scaleY: 0.72 },
  'trama:Proyecto':{ ditherDensity: 0.44, baseRadius: 48, noiseAmp: 0.16, noiseFreq: 0.80, scaleX: 1.40, scaleY: 0.72 },
}
export const DEFAULT_VISUAL = NODE_VISUALS['trama:Club']

export const TYPE_COLORS: Record<string, string> = {
  'trama:Club':    '#6366f1',
  'trama:Curso':   '#22c55e',
  'trama:Docente': '#f59e0b',
  'trama:Tesis':   '#a855f7',
  'trama:Proyecto':'#ef4444',
}

export const EDGE_VISUALS: Record<string, EdgeVisual> = {
  alianzaCon: { weight: 1.4, dash: [10, 6]    },
  cubreTema:  { weight: 0.7, dash: [2,  5]    },
  asesora:    { weight: 2.0, dash: []          },
  cita:       { weight: 0.7, dash: [6, 3, 1, 3] },
}

export const BAYER: number[][] = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
].map(r => r.map(v => v / 16))

export const RELATIONAL_PREDICATES = ['trama:alianzaCon', 'trama:cubreTema', 'trama:asesora', 'trama:cita']
