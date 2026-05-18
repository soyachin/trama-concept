import type { TNode } from '../types/graph'

export function initLayout(nodes: TNode[], w: number, h: number) {
  const cx = w / 2, cy = h / 2
  const groups: Record<string, TNode[]> = {}
  for (const n of nodes) {
    if (!groups[n.type]) groups[n.type] = []
    groups[n.type].push(n)
  }
  const order = [
    'Club', 'Carrera', 'Curso', 'Docente',
    'Departamento', 'GrupoInvestigacion',
    'Proyecto', 'Laboratorio', 'Equipo',
  ]
  const radii = [185, 300, 420, 560, 700, 800, 920, 1040, 1160]
  for (let i = 0; i < order.length; i++) {
    const g = groups[order[i]] ?? []
    const R = radii[i], step = (Math.PI * 2) / Math.max(g.length, 1)
    const off = (i * Math.PI) / 3.5
    for (let j = 0; j < g.length; j++) {
      g[j].x  = cx + Math.cos(step * j + off) * R
      g[j].y  = cy + Math.sin(step * j + off) * R
      g[j].vx = (Math.random() - 0.5) * 0.2
      g[j].vy = (Math.random() - 0.5) * 0.2
    }
  }
  // Handle any unrecognized types
  const remaining = nodes.filter(n => !order.includes(n.type))
  const step = (Math.PI * 2) / Math.max(remaining.length, 1)
  for (let j = 0; j < remaining.length; j++) {
    remaining[j].x = cx + Math.cos(step * j) * 1200
    remaining[j].y = cy + Math.sin(step * j) * 1200
    remaining[j].vx = (Math.random() - 0.5) * 0.2
    remaining[j].vy = (Math.random() - 0.5) * 0.2
  }
}
