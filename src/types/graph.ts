export interface NodeVisual {
  ditherDensity: number
  baseRadius: number
  noiseAmp: number
  noiseFreq: number
  scaleX: number
  scaleY: number
}

// Metadata embebida en cada nodo cuando viene del quipu. Valor: string,
// arreglo de strings, o lista de relaciones (perteneceA, asesoradoPor, ...)
// donde el objeto vive como hidden_type del quipu.
export interface RelatedRef { slug: string; label: string }
export type NodeMetaValue = string | string[] | RelatedRef[]

export interface TNode {
  id: string; type: string; label: string; description: string
  tags: string[]; founded?: string; area?: string; ciclo?: string
  crisUrl?: string; uri?: string
  metadata?: Record<string, NodeMetaValue>
  groupKey?: string
  // `synthetic` marca nodos no-RDF que estructuran el layout del quipu:
  // raíz ("comunidad UTEC") y nudos cabecera por área. No participan del
  // grafo lógico, solo del layout y rendering.
  synthetic?: boolean
  x: number; y: number; vx: number; vy: number
  fx?: number | null; fy?: number | null
}

export interface TEdge {
  source: string; target: string; predicate: string; waveOff: number
  // `synthetic` para edges estructurales del quipu (raíz→área, área→org).
  synthetic?: boolean
}

export interface QuipuGraph {
  id: string
  label: string
  groups: { key: string }[]
  nodes: TNode[]
  edges: TEdge[]
}

export interface QuipuSummary {
  id: string
  label: string
  description: string
  status: 'active' | 'coming-soon'
}
