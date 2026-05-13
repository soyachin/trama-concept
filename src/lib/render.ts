import type p5 from 'p5'
import type { TNode, TEdge, NodeVisual } from '../types/graph'
import { TYPE_COLORS, EDGE_VISUALS, BAYER, ACC, FG } from '../config/visuals'

export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function qbez(a: number, b: number, c: number, t: number) {
  return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c
}

export function drawNode(_p: p5, ctx: CanvasRenderingContext2D, n: TNode, _v: NodeVisual, _t: number, _hov: boolean, sel: boolean, alpha: number) {
  const typeColor = TYPE_COLORS[n.type] ?? '#6366f1'
  const [cr, cg, cb] = rgb(typeColor)

  if (sel) {
    const maxDist = 14
    const GS = 5
    for (let gi = 0, gx = n.x - 26; gx <= n.x + 26; gi++, gx += GS) {
      for (let gj = 0, gy = n.y - 26; gy <= n.y + 26; gj++, gy += GS) {
        const dx = gx - n.x, dy = gy - n.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 12 || dist > 26) continue
        const threshold = 1 - (dist - 12) / maxDist
        const bx = ((gi % 4) + 4) % 4
        const by = ((gj % 4) + 4) % 4
        if (BAYER[by][bx] < threshold) {
          ctx.fillStyle = `rgba(${cr},${cg},${cb},0.45)`
          ctx.fillRect(gx, gy, 2, 2)
        }
      }
    }
  }

  ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`
  ctx.beginPath()
  ctx.arc(n.x, n.y, 12, 0, Math.PI * 2)
  ctx.fill()

  const [lr, lg, lb] = rgb(sel ? ACC : FG)
  ctx.fillStyle   = `rgba(${lr},${lg},${lb},${alpha})`
  ctx.font        = `italic 13px 'Cormorant Garamond', Georgia, serif`
  ctx.textAlign   = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(n.label, n.x, n.y + 19)
}

export function drawEdge(ctx: CanvasRenderingContext2D, e: TEdge, src: TNode, tgt: TNode, t: number, alpha: number, active: boolean) {
  const vis  = EDGE_VISUALS[e.predicate] ?? { weight: 1, dash: [] }
  const midX = (src.x + tgt.x) / 2, midY = (src.y + tgt.y) / 2
  const len  = Math.hypot(tgt.x - src.x, tgt.y - src.y) || 1
  const px   = (-(tgt.y - src.y) / len) * 38
  const py   = ((tgt.x - src.x) / len) * 38
  const wave = Math.sin(t * 0.7 + e.waveOff) * 0.5
  const cx   = midX + px * wave
  const cy   = midY + py * wave

  const col        = active ? ACC : FG
  const [cr, cg, cb] = rgb(col)
  ctx.setLineDash(vis.dash)
  ctx.strokeStyle  = `rgba(${cr},${cg},${cb},${alpha})`
  ctx.lineWidth    = vis.weight * (active ? 1.9 : 1)
  ctx.beginPath()
  ctx.moveTo(src.x, src.y)
  ctx.quadraticCurveTo(cx, cy, tgt.x, tgt.y)
  ctx.stroke()
  ctx.setLineDash([])

  if (active) {
    const wt = ((t * 0.55 + e.waveOff * 0.15) % 1 + 1) % 1
    const wx = qbez(src.x, cx, tgt.x, wt)
    const wy = qbez(src.y, cy, tgt.y, wt)
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`
    ctx.beginPath()
    ctx.arc(wx, wy, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
}
