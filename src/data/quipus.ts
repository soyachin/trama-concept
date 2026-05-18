import type { TNode, TEdge, QuipuSummary, NodeMetaValue, RelatedRef } from '../types/graph'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

interface ApiNode {
  id: string
  label: string
  type: string
  uri: string
  metadata: Record<string, NodeMetaValue>
}
interface ApiEdge { source: string; target: string; predicate: string }
interface ApiGroup { key: string; nodeIds: string[] }
interface ApiQuipuGraph {
  id: string
  label: string
  groupBy: string | null
  nodes: ApiNode[]
  edges: ApiEdge[]
  groups: ApiGroup[]
}

export interface QuipuGraph {
  id: string
  label: string
  groupBy: string | null
  groups: ApiGroup[]
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
    id: AREA_PREFIX + g.key,
    type: 'AreaHeader',
    label: g.key,
    description: '',
    tags: [],
    synthetic: true,
    groupKey: g.key,
    x: 0, y: 0, vx: 0, vy: 0,
  }))

  const dataNodes: TNode[] = data.nodes.map(n => {
    const groupKey = pickGroupKey(n.metadata, data.groupBy)
    return {
      id: n.id,
      type: n.type,
      label: n.label,
      description: '',
      tags: [],
      uri: n.uri,
      metadata: n.metadata,
      area: typeof n.metadata?.area === 'string' ? (n.metadata.area as string) : undefined,
      groupKey,
      x: 0, y: 0, vx: 0, vy: 0,
    }
  })

  const dataNodeIds = new Set(dataNodes.map(n => n.id))
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
    groups: data.groups,
    nodes: [root, ...areaHeaders, ...dataNodes],
    edges: [...rootEdges, ...areaEdges, ...dataEdges],
  }
}

function pickGroupKey(
  metadata: Record<string, NodeMetaValue> | undefined,
  groupBy: string | null,
): string | undefined {
  if (!groupBy || !metadata) return undefined
  const v = metadata[groupBy]
  if (typeof v === 'string') return v
  if (Array.isArray(v) && v.length > 0) {
    const first = v[0]
    if (typeof first === 'string') return first
    if (isRelatedRef(first)) return first.label
  }
  return undefined
}

function isRelatedRef(v: unknown): v is RelatedRef {
  return typeof v === 'object' && v !== null && 'slug' in v && 'label' in v
}

// Fallback: arma un quipu social con datos de muestra cuando el backend no
// responde. Útil para diseñar offline.
export function getDummyQuipuGraph(): QuipuGraph {
  const groups: ApiGroup[] = [
    { key: 'Especializada', nodeIds: ['club-acm-utec', 'club-ieee-utec', 'club-giit'] },
    { key: 'Arte y Cultura', nodeIds: ['club-tuna', 'club-teatro'] },
    { key: 'Clubes Deportivos', nodeIds: ['club-futbol'] },
  ]
  const dummy: ApiQuipuGraph = {
    id: 'social',
    label: 'Trama social',
    groupBy: 'area',
    groups,
    nodes: [
      { id: 'club-acm-utec', label: 'ACM UTEC', type: 'OrganizacionEstudiantil', uri: '', metadata: { area: 'Especializada', perteneceA: [{ slug: 'cc', label: 'Ciencia de la Computación' }] } },
      { id: 'club-ieee-utec', label: 'IEEE UTEC', type: 'OrganizacionEstudiantil', uri: '', metadata: { area: 'Especializada', perteneceA: [{ slug: 'ie', label: 'Ingeniería Electrónica' }] } },
      { id: 'club-giit', label: 'GIIT Robotics', type: 'OrganizacionEstudiantil', uri: '', metadata: { area: 'Especializada' } },
      { id: 'club-tuna', label: 'Tuna UTEC', type: 'OrganizacionEstudiantil', uri: '', metadata: { area: 'Arte y Cultura' } },
      { id: 'club-teatro', label: 'Grupo de Teatro', type: 'OrganizacionEstudiantil', uri: '', metadata: { area: 'Arte y Cultura' } },
      { id: 'club-futbol', label: 'Club de Fútbol', type: 'OrganizacionEstudiantil', uri: '', metadata: { area: 'Clubes Deportivos' } },
    ],
    edges: [
      { source: 'club-acm-utec', target: 'club-ieee-utec', predicate: 'alianzaCon' },
      { source: 'club-ieee-utec', target: 'club-giit', predicate: 'alianzaCon' },
    ],
  }
  return buildQuipuGraph(dummy)
}
