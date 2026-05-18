import type { TNode } from '../types/graph'
import { SYNTHETIC } from '../data/quipus'

// Layout literal de quipu: cuerda primaria horizontal en la parte superior,
// y un pendant cord vertical por cada área que cuelga desde la cuerda
// primaria. Las orgs son knots atadas a lo largo de su pendant.
//
// Todos los nodos quedan pinneados (fx/fy) — la simulación no los mueve.
// El cord visual se dibuja en lib/render.ts pasando POR las posiciones
// de los knots.
//
// Layout legacy (sin raíz sintética) cae al ring-radial original para
// data antigua o dummies sin estructura de quipu.
export function initLayout(nodes: TNode[], w: number, h: number) {
  const root = nodes.find(n => n.id === SYNTHETIC.ROOT_ID)
  if (root) {
    initQuipuLayout(nodes, w, h)
    return
  }
  initLegacyLayout(nodes, w / 2, h / 2)
}

function initQuipuLayout(nodes: TNode[], w: number, h: number) {
  const root = nodes.find(n => n.id === SYNTHETIC.ROOT_ID)!
  const cordY = Math.max(140, h * 0.16)
  const labelY = cordY - 64
  const leftX = Math.max(110, w * 0.10)
  const rightX = Math.min(w - 110, w * 0.90)

  // Raíz: posicionada arriba de la cuerda primaria, sin halo, solo label.
  root.x = w / 2
  root.y = labelY
  root.fx = w / 2
  root.fy = labelY
  root.vx = 0
  root.vy = 0

  const areaHeaders = nodes.filter(n => n.type === 'AreaHeader')
  const nAreas = Math.max(areaHeaders.length, 1)
  for (let i = 0; i < areaHeaders.length; i++) {
    const x = leftX + (i + 0.5) * (rightX - leftX) / nAreas
    areaHeaders[i].x = x
    areaHeaders[i].y = cordY
    areaHeaders[i].fx = x
    areaHeaders[i].fy = cordY
    areaHeaders[i].vx = 0
    areaHeaders[i].vy = 0
  }

  // Agrupar orgs por área y atarlas como knots verticalmente debajo del
  // header. Espaciado adaptativo: pendants con muchas orgs se aprietan
  // (mín 28px), pendants cortos se relajan (máx 56px). Las longitudes
  // dispares son auténticas — los quipus reales tienen cords de longitudes
  // diferentes según los datos que codifican.
  const byArea: Record<string, TNode[]> = {}
  for (const n of nodes) {
    if (n.synthetic) continue
    if (!n.groupKey) continue
    byArea[n.groupKey] ??= []
    byArea[n.groupKey].push(n)
  }

  const FIRST_OFFSET = 80
  const targetLen = Math.max(360, h * 0.72)
  const headerByArea = new Map(areaHeaders.map(h => [h.groupKey!, h]))

  for (const [area, orgs] of Object.entries(byArea)) {
    const header = headerByArea.get(area)
    if (!header) continue
    const spacing = orgs.length <= 1
      ? 0
      : Math.max(28, Math.min(56, (targetLen - FIRST_OFFSET) / (orgs.length - 1)))
    for (let j = 0; j < orgs.length; j++) {
      const ox = header.x
      const oy = header.y + FIRST_OFFSET + j * spacing
      orgs[j].x = ox
      orgs[j].y = oy
      orgs[j].fx = ox
      orgs[j].fy = oy
      orgs[j].vx = 0
      orgs[j].vy = 0
    }
  }

  // Orfans: no debería pasar para Quipu Social (todos los nodos de datos
  // tienen `area`). Por seguridad, los apilamos al lado derecho.
  const orphans = nodes.filter(n => !n.synthetic && !n.groupKey)
  for (let j = 0; j < orphans.length; j++) {
    orphans[j].x = w - 60
    orphans[j].y = cordY + FIRST_OFFSET + j * 40
    orphans[j].fx = orphans[j].x
    orphans[j].fy = orphans[j].y
    orphans[j].vx = 0
    orphans[j].vy = 0
  }
}

function initLegacyLayout(nodes: TNode[], cx: number, cy: number) {
  const groups: Record<string, TNode[]> = {}
  for (const n of nodes) {
    if (!groups[n.type]) groups[n.type] = []
    groups[n.type].push(n)
  }
  const order = [
    'OrganizacionEstudiantil', 'Club', 'Actividad',
    'Carrera', 'Curso', 'Docente',
    'Departamento', 'GrupoInvestigacion',
    'Proyecto', 'Laboratorio', 'Equipo',
  ]
  const radii = [185, 230, 300, 380, 470, 570, 680, 780, 880, 980, 1080]
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
  const remaining = nodes.filter(n => !order.includes(n.type))
  const step = (Math.PI * 2) / Math.max(remaining.length, 1)
  for (let j = 0; j < remaining.length; j++) {
    remaining[j].x = cx + Math.cos(step * j) * 1200
    remaining[j].y = cy + Math.sin(step * j) * 1200
    remaining[j].vx = (Math.random() - 0.5) * 0.2
    remaining[j].vy = (Math.random() - 0.5) * 0.2
  }
}
