export interface NodeVisual {
  ditherDensity: number
  baseRadius: number
  noiseAmp: number
  noiseFreq: number
  scaleX: number
  scaleY: number
}

export interface EdgeVisual {
  weight: number
  dash: number[]
}

export interface TNode {
  id: string; type: string; label: string; description: string
  tags: string[]; founded?: string; area?: string; ciclo?: string
  crisUrl?: string; uri?: string
  x: number; y: number; vx: number; vy: number
}

export interface TEdge {
  source: string; target: string; predicate: string; waveOff: number
}
