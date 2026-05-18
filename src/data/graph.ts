import type { TNode, TEdge } from '../types/graph'

interface ApiNode {
  id: string
  label: string
  type: string
  uri: string
}
interface ApiLink {
  source: string
  target: string
  predicate: string
}
interface ApiResponse {
  nodes: ApiNode[]
  links: ApiLink[]
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

export async function fetchGraph(): Promise<{ nodes: TNode[]; edges: TEdge[] }> {
  const res = await fetch(`${API_BASE}/graph`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data: ApiResponse = await res.json()
  return processApiResponse(data)
}

function processApiResponse(data: ApiResponse): { nodes: TNode[]; edges: TEdge[] } {
  const nodes: TNode[] = data.nodes.map(n => ({
    id: n.id,
    type: n.type,
    label: n.label,
    description: '',
    tags: [],
    uri: n.uri,
    x: 0, y: 0, vx: 0, vy: 0,
  }))

  const nodeIds = new Set(nodes.map(n => n.id))
  const edges: TEdge[] = data.links
    .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
    .map(l => ({
      source: l.source,
      target: l.target,
      predicate: l.predicate,
      waveOff: Math.random() * Math.PI * 2,
    }))

  return { nodes, edges }
}

// Fallback: dummy data for standalone dev without backend
export function getDummyGraph(): { nodes: TNode[]; edges: TEdge[] } {
  const nodes: TNode[] = [
    { id: 'club-acm-utec', type: 'Club', label: 'ACM UTEC', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'club-ieee-utec', type: 'Club', label: 'IEEE UTEC', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'club-giit-robotics', type: 'Club', label: 'GIIT Robotics', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'carrera-ciencia-de-la-computacion', type: 'Carrera', label: 'Ciencia de la Computación', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'carrera-ingenieria-mecatronica', type: 'Carrera', label: 'Ingeniería Mecatrónica', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'carrera-ingenieria-electronica', type: 'Carrera', label: 'Ingeniería Electrónica', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'doc-example-1', type: 'Docente', label: 'Prof. García', description: '', tags: [], area: 'Computación', x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'doc-example-2', type: 'Docente', label: 'Prof. López', description: '', tags: [], area: 'Mecatrónica', x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'curso-cs2100', type: 'Curso', label: 'Algoritmos', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'curso-cs3100', type: 'Curso', label: 'Estructuras de Datos', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'proy-example', type: 'Proyecto', label: 'Robot Autónomo', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'lab-manufactura', type: 'Laboratorio', label: 'Lab Manufactura', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'equipo-1', type: 'Equipo', label: 'Impresora 3D', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'depto-cs', type: 'Departamento', label: 'Depto. Computación', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
    { id: 'grupo-ginia', type: 'GrupoInvestigacion', label: 'GINIA', description: '', tags: [], x: 0, y: 0, vx: 0, vy: 0 },
  ]
  const edges: TEdge[] = [
    { source: 'club-acm-utec', target: 'carrera-ciencia-de-la-computacion', predicate: 'perteneceA', waveOff: 0.5 },
    { source: 'club-ieee-utec', target: 'carrera-ingenieria-electronica', predicate: 'perteneceA', waveOff: 1.2 },
    { source: 'club-giit-robotics', target: 'carrera-ingenieria-mecatronica', predicate: 'perteneceA', waveOff: 2.0 },
    { source: 'club-acm-utec', target: 'club-ieee-utec', predicate: 'alianzaCon', waveOff: 0.8 },
    { source: 'curso-cs2100', target: 'doc-example-1', predicate: 'dictadoPor', waveOff: 1.5 },
    { source: 'curso-cs3100', target: 'doc-example-1', predicate: 'dictadoPor', waveOff: 2.3 },
    { source: 'doc-example-2', target: 'proy-example', predicate: 'participaEn', waveOff: 0.3 },
    { source: 'doc-example-1', target: 'depto-cs', predicate: 'miembroDe', waveOff: 1.0 },
    { source: 'doc-example-1', target: 'grupo-ginia', predicate: 'investigaEn', waveOff: 1.8 },
    { source: 'equipo-1', target: 'lab-manufactura', predicate: 'ubicadoEn', waveOff: 0.7 },
  ]
  return { nodes, edges }
}
