import type { TNode, TEdge, QuipuSummary, NodeMetaValue } from '../types/graph'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

interface ApiNode {
  id: string
  label: string
  type: string
  groupKey: string | null
  metadata: Record<string, NodeMetaValue>
}
interface ApiEdge { source: string; target: string; predicate: string }
interface ApiQuipuGraph {
  id: string
  label: string
  groupBy: string | null
  nodes: ApiNode[]
  edges: ApiEdge[]
  groups: string[]
}

export interface QuipuGraph {
  id: string
  label: string
  groupBy: string | null
  groups: { key: string }[]
  nodes: TNode[]
  edges: TEdge[]
}

const ROOT_ID = '__root__'
const AREA_PREFIX = '__area__:'

export const SYNTHETIC = { ROOT_ID, AREA_PREFIX } as const

export const ROOT_LABEL = 'comunidad UTEC'

export async function fetchQuipus(): Promise<QuipuSummary[]> {
  const res = await fetch(`${API_BASE}/quipus`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchQuipuGraph(quipuId: string): Promise<QuipuGraph> {
  const res = await fetch(`${API_BASE}/quipus/${quipuId}/graph`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data: ApiQuipuGraph = await res.json()
  return buildQuipuGraph(data)
}

// Construye el grafo renderizable a partir del payload del quipu: agrega la
// raíz "comunidad UTEC" y un nudo cabecera por grupo (área), más las cuerdas
// estructurales raíz→área y área→nodo. Las edges del payload (alianzaCon,
// organizadoPor, ...) viven en paralelo y cruzan áreas libremente.
function buildQuipuGraph(data: ApiQuipuGraph): QuipuGraph {
  const root: TNode = {
    id: ROOT_ID,
    type: 'Root',
    label: ROOT_LABEL,
    description: '',
    tags: [],
    synthetic: true,
    x: 0, y: 0, vx: 0, vy: 0,
  }

  const areaHeaders: TNode[] = data.groups.map(g => ({
    id: AREA_PREFIX + g,
    type: 'AreaHeader',
    label: g,
    description: '',
    tags: [],
    synthetic: true,
    groupKey: g,
    x: 0, y: 0, vx: 0, vy: 0,
  }))

  const dataNodes: TNode[] = data.nodes.map(n => ({
    id: n.id,
    type: n.type,
    label: n.label,
    description: '',
    tags: [],
    metadata: n.metadata,
    groupKey: n.groupKey ?? undefined,
    x: 0, y: 0, vx: 0, vy: 0,
  }))

  const dataNodeIds = new Set(data.nodes.map(n => n.id))
  const dataEdges: TEdge[] = data.edges
    .filter(e => dataNodeIds.has(e.source) && dataNodeIds.has(e.target))
    .map(e => ({
      source: e.source,
      target: e.target,
      predicate: e.predicate,
      waveOff: Math.random() * Math.PI * 2,
    }))

  const rootEdges: TEdge[] = areaHeaders.map(h => ({
    source: ROOT_ID,
    target: h.id,
    predicate: 'quipu',
    waveOff: Math.random() * Math.PI * 2,
    synthetic: true,
  }))

  const areaEdges: TEdge[] = dataNodes
    .filter(n => n.groupKey)
    .map(n => ({
      source: AREA_PREFIX + n.groupKey!,
      target: n.id,
      predicate: 'perteneceArea',
      waveOff: Math.random() * Math.PI * 2,
      synthetic: true,
    }))

  return {
    id: data.id,
    label: data.label,
    groupBy: data.groupBy,
    groups: data.groups.map(g => ({ key: g })),
    nodes: [root, ...areaHeaders, ...dataNodes],
    edges: [...rootEdges, ...areaEdges, ...dataEdges],
  }
}

// Fallback: arma un quipu social con datos de muestra cuando el backend no
// responde. Útil para diseñar offline.
export function getDummyQuipuGraph(): QuipuGraph {
  const groups = ['Especializada', 'Arte y Cultura', 'Clubes Deportivos']
  const dummy: ApiQuipuGraph = {
    id: 'quipu-social',
    label: 'Trama social',
    groupBy: 'area',
    groups,
    nodes: [
      { id: 'club-acm-utec', label: 'ACM UTEC', type: 'OrganizacionEstudiantil', groupKey: 'Especializada', metadata: { area: 'Especializada', perteneceA: ['Ciencia de la Computación'] } },
      { id: 'club-ieee-utec', label: 'IEEE UTEC', type: 'OrganizacionEstudiantil', groupKey: 'Especializada', metadata: { area: 'Especializada', perteneceA: ['Ingeniería Electrónica'] } },
      { id: 'club-giit', label: 'GIIT Robotics', type: 'OrganizacionEstudiantil', groupKey: 'Especializada', metadata: { area: 'Especializada' } },
      { id: 'club-tuna', label: 'Tuna UTEC', type: 'OrganizacionEstudiantil', groupKey: 'Arte y Cultura', metadata: { area: 'Arte y Cultura' } },
      { id: 'club-teatro', label: 'Grupo de Teatro', type: 'OrganizacionEstudiantil', groupKey: 'Arte y Cultura', metadata: { area: 'Arte y Cultura' } },
      { id: 'club-futbol', label: 'Club de Fútbol', type: 'OrganizacionEstudiantil', groupKey: 'Clubes Deportivos', metadata: { area: 'Clubes Deportivos' } },
    ],
    edges: [
      { source: 'club-acm-utec', target: 'club-ieee-utec', predicate: 'alianzaCon' },
      { source: 'club-ieee-utec', target: 'club-giit', predicate: 'alianzaCon' },
    ],
  }
  return buildQuipuGraph(dummy)
}
