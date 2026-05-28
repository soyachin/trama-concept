import type { TNode } from '../types/graph'
import { SYNTHETIC } from '../data/quipus'

// Layout radial-jerárquico para el quipu social: raíz al centro,
// nudos cabecera por área en un anillo intermedio, y nodos de datos
// agrupados alrededor de su nudo cabecera. Todos los nodos (incluida
// la raíz y las cabeceras) quedan libres para que la simulación los
// acomode según sus alianzas y vínculos.
//
// Layout legacy (cuando no hay raíz sintética: cargamos data antigua o
// dummies sin estructura de quipu) cae al ring-radial original por tipo.
export function initLayout(nodes: TNode[], w: number, h: number) {
  const cx = w / 2
  const cy = h / 2

  const root = nodes.find(n => n.id === SYNTHETIC.ROOT_ID)
  if (root) {
    initQuipuLayout(nodes, cx, cy)
    return
  }
  initLegacyLayout(nodes, cx, cy)
}

function initQuipuLayout(nodes: TNode[], cx: number, cy: number) {
  const root = nodes.find(n => n.id === SYNTHETIC.ROOT_ID)!
  root.x = cx
  root.y = cy
  root.vx = 0
  root.vy = 0

  const areaHeaders = nodes.filter(n => n.type === 'AreaHeader')
  const R_AREA = 280
  for (let i = 0; i < areaHeaders.length; i++) {
    const ang = (i / areaHeaders.length) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(ang) * R_AREA
    const y = cy + Math.sin(ang) * R_AREA
    areaHeaders[i]!.x = x
    areaHeaders[i]!.y = y
    areaHeaders[i]!.vx = 0
    areaHeaders[i]!.vy = 0
  }

  // Posicionar nodos de datos como un arco alrededor de su nudo cabecera,
  // empujados hacia afuera de la raíz. Conserva forma de cuerda colgante.
  const byArea: Record<string, TNode[]> = {}
  for (const n of nodes) {
    if (n.synthetic) continue
    if (!n.groupKey) continue
    ;(byArea[n.groupKey] ??= []).push(n)
  }
  const headerByArea = new Map(areaHeaders.map(h => [h.groupKey!, h]))
  for (const [area, members] of Object.entries(byArea)) {
    const header = headerByArea.get(area)
    if (!header) continue
    const baseAng = Math.atan2(header.y - cy, header.x - cx)
    const fanWidth = Math.min(Math.PI * 0.55, 0.18 + members.length * 0.04)
    const ring = 180 + Math.min(120, members.length * 4)
    for (let j = 0; j < members.length; j++) {
      const t = members.length === 1 ? 0 : (j / (members.length - 1)) - 0.5
      const ang = baseAng + t * fanWidth
      const r = ring + ((j % 3) - 1) * 22
      members[j]!.x = cx + Math.cos(ang) * (R_AREA + r)
      members[j]!.y = cy + Math.sin(ang) * (R_AREA + r)
      members[j]!.vx = (Math.random() - 0.5) * 0.2
      members[j]!.vy = (Math.random() - 0.5) * 0.2
    }
  }

  // Nodos sin grupo (no debería pasar para Quipu Social, pero por si acaso).
  const orphans = nodes.filter(n => !n.synthetic && !n.groupKey)
  const step = (Math.PI * 2) / Math.max(orphans.length, 1)
  for (let j = 0; j < orphans.length; j++) {
    orphans[j]!.x = cx + Math.cos(step * j) * 600
    orphans[j]!.y = cy + Math.sin(step * j) * 600
    orphans[j]!.vx = (Math.random() - 0.5) * 0.2
    orphans[j]!.vy = (Math.random() - 0.5) * 0.2
  }
}

function initLegacyLayout(nodes: TNode[], cx: number, cy: number) {
  const groups: Record<string, TNode[]> = {}
  for (const n of nodes) {
    ;(groups[n.type] ??= []).push(n)
  }
  const order = [
    'OrganizacionEstudiantil', 'Club', 'Actividad',
    'Carrera', 'Curso', 'Docente',
    'Departamento', 'GrupoInvestigacion',
    'Proyecto', 'Laboratorio', 'Equipo',
  ]
  const radii = [185, 230, 300, 380, 470, 570, 680, 780, 880, 980, 1080]
  for (let i = 0; i < order.length; i++) {
    const g = groups[order[i]!] ?? []
    const R = radii[i]!, step = (Math.PI * 2) / Math.max(g.length, 1)
    const off = (i * Math.PI) / 3.5
    for (let j = 0; j < g.length; j++) {
      g[j]!.x  = cx + Math.cos(step * j + off) * R
      g[j]!.y  = cy + Math.sin(step * j + off) * R
      g[j]!.vx = (Math.random() - 0.5) * 0.2
      g[j]!.vy = (Math.random() - 0.5) * 0.2
    }
  }
  const remaining = nodes.filter(n => !order.includes(n.type))
  const step = (Math.PI * 2) / Math.max(remaining.length, 1)
  for (let j = 0; j < remaining.length; j++) {
    remaining[j]!.x = cx + Math.cos(step * j) * 1200
    remaining[j]!.y = cy + Math.sin(step * j) * 1200
    remaining[j]!.vx = (Math.random() - 0.5) * 0.2
    remaining[j]!.vy = (Math.random() - 0.5) * 0.2
  }
}
