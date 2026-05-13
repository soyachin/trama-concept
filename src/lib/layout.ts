import type { TNode } from '../types/graph'

export function initLayout(nodes: TNode[], w: number, h: number) {
  const cx = w / 2, cy = h / 2
  const groups: Record<string, TNode[]> = {}
  for (const n of nodes) {
    if (!groups[n.type]) groups[n.type] = []
    groups[n.type].push(n)
  }
  const order = ['trama:Club', 'trama:Curso', 'trama:Docente', 'trama:Tesis', 'trama:Proyecto']
  const radii = [185, 315, 425, 515, 515]
  for (let i = 0; i < order.length; i++) {
    const g = groups[order[i]] ?? []
    const R = radii[i], step = (Math.PI * 2) / Math.max(g.length, 1)
    const off = (i * Math.PI) / 2.8
    for (let j = 0; j < g.length; j++) {
      g[j].x  = cx + Math.cos(step * j + off) * R
      g[j].y  = cy + Math.sin(step * j + off) * R
      g[j].vx = (Math.random() - 0.5) * 0.3
      g[j].vy = (Math.random() - 0.5) * 0.3
    }
  }
}
