import type { TNode, TEdge, QuipuGraph, NodeMetaValue, RelatedRef } from '../types/graph'

interface ApiQuipuNode {
  id: string
  label: string
  type: string
  group_key: string | null
  metadata: Record<string, string>
}

interface ApiQuipuEdge {
  source: string
  target: string
  predicate: string
}

export interface ApiQuipuGraph {
  id: string
  label: string
  group_by: string | null
  nodes: ApiQuipuNode[]
  edges: ApiQuipuEdge[]
  groups: string[]
}

const ROOT_ID = '__root__'
const AREA_PREFIX = '__area__:'

export const SYNTHETIC = { ROOT_ID, AREA_PREFIX } as const

export const ROOT_LABEL = 'comunidad UTEC'

export function adaptQuipuGraph(raw: ApiQuipuGraph): QuipuGraph {
  const root: TNode = {
    id: ROOT_ID,
    type: 'Root',
    label: ROOT_LABEL,
    description: '',
    tags: [],
    synthetic: true,
    x: 0, y: 0, vx: 0, vy: 0,
  }

  const areaHeaders: TNode[] = raw.groups.map(g => ({
    id: AREA_PREFIX + g,
    type: 'AreaHeader',
    label: g,
    description: '',
    tags: [],
    synthetic: true,
    groupKey: g,
    x: 0, y: 0, vx: 0, vy: 0,
  }))

  const dataNodes: TNode[] = raw.nodes.map(n => ({
    id: n.id,
    type: n.type,
    label: n.label,
    description: '',
    tags: [],
    metadata: n.metadata as Record<string, NodeMetaValue>,
    groupKey: n.group_key ?? undefined,
    x: 0, y: 0, vx: 0, vy: 0,
  }))

  const dataNodeIds = new Set(raw.nodes.map(n => n.id))
  const dataEdges: TEdge[] = raw.edges
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
    id: raw.id,
    label: raw.label,
    groups: raw.groups.map(g => ({ key: g })),
    nodes: [root, ...areaHeaders, ...dataNodes],
    edges: [...rootEdges, ...areaEdges, ...dataEdges],
  }
}

// ── Node detail enrichment ───────────────────────────────────────

export interface ApiRelationItem {
  predicate: string
  target: string
  target_label: string
  direction: string | null
}

export interface ApiResourceDetail {
  uri: string
  slug: string
  label: string
  properties: Record<string, string>
  relations: ApiRelationItem[]
}

export const TYPE_TO_ENDPOINT: Record<string, string> = {
  OrganizacionEstudiantil: 'organizaciones-estudiantiles',
  Docente: 'docentes',
  Club: 'clubes',
  Carrera: 'carreras',
  Curso: 'cursos',
  Departamento: 'departamentos',
  GrupoInvestigacion: 'grupos-investigacion',
  Laboratorio: 'laboratorios',
  Equipo: 'equipos',
  Proyecto: 'proyectos',
}

export function enrichNode(node: TNode, detail: ApiResourceDetail): TNode {
  const meta: Record<string, NodeMetaValue> = { ...detail.properties }

  for (const rel of detail.relations) {
    const existing = meta[rel.predicate]
    if (
      Array.isArray(existing) &&
      existing.length > 0 &&
      typeof existing[0] === 'object' &&
      'slug' in (existing[0] as object)
    ) {
      ;(existing as RelatedRef[]).push({ slug: rel.target, label: rel.target_label })
    } else {
      meta[rel.predicate] = [{ slug: rel.target, label: rel.target_label }]
    }
  }

  if (node.metadata) {
    for (const [k, v] of Object.entries(node.metadata)) {
      if (!(k in meta)) meta[k] = v
    }
  }

  return { ...node, metadata: meta }
}
