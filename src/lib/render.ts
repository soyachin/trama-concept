import type { TNode, TEdge } from '../types/graph'
import { getNodeColor, ROPE_CONFIGS, BAYER } from '../config/visuals'
// fg/acc/bg are consumed via COLOR roles in typography.ts
import { TEXT, composeFont, COLOR, composeRgba } from '../config/typography'

export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function qbez(a: number, b: number, c: number, t: number) {
  return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c
}

// ─── Viewport culling ───────────────────────────────────────────
export function isInViewport(
  x: number, y: number, r: number,
  vx1: number, vy1: number, vx2: number, vy2: number,
): boolean {
  return x + r >= vx1 && x - r <= vx2 && y + r >= vy1 && y - r <= vy2
}

export function edgeInViewport(
  src: TNode, tgt: TNode, margin: number,
  vx1: number, vy1: number, vx2: number, vy2: number,
): boolean {
  const minX = Math.min(src.x, tgt.x) - margin
  const maxX = Math.max(src.x, tgt.x) + margin
  const minY = Math.min(src.y, tgt.y) - margin
  const maxY = Math.max(src.y, tgt.y) + margin
  return maxX >= vx1 && minX <= vx2 && maxY >= vy1 && minY <= vy2
}

// ─── Woven texture background (pre-rendered at buffer resolution) ─
let wovenCanvas: HTMLCanvasElement | null = null
let wovenDpr = 0

export function getWovenTexture(w: number, h: number, dpr = 1): HTMLCanvasElement {
  const bw = Math.round(w * dpr)
  const bh = Math.round(h * dpr)
  if (wovenCanvas && wovenCanvas.width === bw && wovenCanvas.height === bh && wovenDpr === dpr)
    return wovenCanvas
  wovenCanvas = document.createElement('canvas')
  wovenCanvas.width = bw
  wovenCanvas.height = bh
  wovenDpr = dpr
  const ctx = wovenCanvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  const wovenH = composeRgba(COLOR.wovenLineH)
  const wovenV = composeRgba(COLOR.wovenLineV)
  const dotFg = composeRgba(COLOR.wovenDotFg)
  const dotAcc = composeRgba(COLOR.wovenDotAcc)
  const spacing = 22
  for (let y = 0; y < h; y += spacing) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y)
    ctx.strokeStyle = wovenH; ctx.lineWidth = 0.5; ctx.stroke()
  }
  for (let x = 0; x < w; x += spacing) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h)
    ctx.strokeStyle = wovenV; ctx.lineWidth = 0.5; ctx.stroke()
  }
  for (let y = 0; y < h; y += spacing) {
    for (let x = 0; x < w; x += spacing) {
      const even = ((x / spacing + y / spacing) % 2 === 0)
      ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2)
      ctx.fillStyle = even ? dotFg : dotAcc
      ctx.fill()
    }
  }
  return wovenCanvas
}

// ─── Quipu rope edge drawing ────────────────────────────────────
export function drawRope(
  ctx: CanvasRenderingContext2D,
  e: TEdge, src: TNode, tgt: TNode,
  t: number, alpha: number, active: boolean, zoom: number,
) {
  const cfg = ROPE_CONFIGS[e.predicate] ?? ROPE_CONFIGS.dictadoPor

  const ropeRole = active ? COLOR.ropeActive : COLOR.ropeBase
  let ropeRgb: [number, number, number]
  if (e.predicate === 'perteneceArea') {
    ropeRgb = getNodeColor(src)
  } else {
    ropeRgb = rgb(ropeRole.base())
  }

  const dx = tgt.x - src.x, dy = tgt.y - src.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len

  const sag = len * 0.12
  const wave = Math.sin(t * cfg.waveSpeed + e.waveOff) * 0.3
  const cx0 = (src.x + tgt.x) / 2 + nx * sag * wave
  const cy0 = (src.y + tgt.y) / 2 + ny * sag * wave

  // LOD: at low zoom, draw simple line instead of multi-strand rope
  if (zoom < 0.35 || cfg.strands <= 1) {
    ctx.beginPath()
    ctx.moveTo(src.x, src.y)
    ctx.quadraticCurveTo(cx0, cy0, tgt.x, tgt.y)
    ctx.strokeStyle = composeRgba(ropeRole, alpha, ropeRgb)
    ctx.lineWidth = cfg.weight * (active ? 1.6 : 1)
    ctx.setLineDash(cfg.dash)
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    // Multi-strand twisted rope
    const steps = zoom > 1.2 ? 40 : 20
    for (let si = 0; si < cfg.strands; si++) {
      const off = (si - (cfg.strands - 1) / 2) * cfg.spread
      const phaseOff = si * (Math.PI * 2 / cfg.strands)

      ctx.beginPath()
      ctx.moveTo(src.x + nx * off, src.y + ny * off)

      for (let i = 1; i <= steps; i++) {
        const tt = i / steps
        const bx = (1 - tt) * (1 - tt) * src.x + 2 * (1 - tt) * tt * cx0 + tt * tt * tgt.x
        const by = (1 - tt) * (1 - tt) * src.y + 2 * (1 - tt) * tt * cy0 + tt * tt * tgt.y
        const tbx = 2 * (1 - tt) * (cx0 - src.x) + 2 * tt * (tgt.x - cx0)
        const tby = 2 * (1 - tt) * (cy0 - src.y) + 2 * tt * (tgt.y - cy0)
        const tlen = Math.hypot(tbx, tby) || 1
        const tnx = -tby / tlen, tny = tbx / tlen
        const twist = Math.sin(tt * Math.PI * cfg.twist * 4 + phaseOff + t * 0.5) * off * 0.7
        ctx.lineTo(bx + tnx * (off + twist), by + tny * (off + twist))
      }

      const strokeA = active
        ? alpha
        : (alpha * (0.55 + 0.45 * (1 - Math.abs(si - (cfg.strands - 1) / 2) / Math.max(cfg.strands - 1, 1))))

      ctx.strokeStyle = composeRgba(ropeRole, strokeA, ropeRgb)
      ctx.lineWidth = cfg.weight * (active ? 1.6 : 1) * (si === Math.floor(cfg.strands / 2) ? 1.1 : 0.85)
      ctx.setLineDash([])
      ctx.stroke()
    }
  }

  // Traveling bead on active edge
  if (active) {
    const wt = ((t * 0.5 + e.waveOff * 0.15) % 1 + 1) % 1
    const bx2 = qbez(src.x, cx0, tgt.x, wt)
    const by2 = qbez(src.y, cy0, tgt.y, wt)
    ctx.beginPath()
    ctx.arc(bx2, by2, 3.2, 0, Math.PI * 2)
    ctx.fillStyle = composeRgba(ropeRole, alpha, ropeRgb)
    ctx.fill()
  }

  // Arrowhead for directed predicates (skip at very low zoom)
  if (cfg.directed && zoom > 0.35) {
    const at = 0.78
    const ax = qbez(src.x, cx0, tgt.x, at)
    const ay = qbez(src.y, cy0, tgt.y, at)
    const tanX = 2 * (1 - at) * (cx0 - src.x) + 2 * at * (tgt.x - cx0)
    const tanY = 2 * (1 - at) * (cy0 - src.y) + 2 * at * (tgt.y - cy0)
    const tl = Math.hypot(tanX, tanY) || 1
    const udx = tanX / tl, udy = tanY / tl
    const arrLen = 7 * (active ? 1.4 : 1)
    const arrW = 3.5 * (active ? 1.3 : 1)
    const pnx = -udy, pny = udx
    ctx.beginPath()
    ctx.moveTo(ax + udx * arrLen, ay + udy * arrLen)
    ctx.lineTo(ax - pnx * arrW, ay - pny * arrW)
    ctx.lineTo(ax + pnx * arrW, ay + pny * arrW)
    ctx.closePath()
    ctx.fillStyle = composeRgba(ropeRole, active ? alpha : alpha * 0.7, ropeRgb)
    ctx.fill()
  }
}

// ─── Quipu knot node drawing ────────────────────────────────────
export function drawKnot(
  ctx: CanvasRenderingContext2D,
  n: TNode, t: number,
  hov: boolean, sel: boolean, alpha: number, zoom: number,
) {
  // Raíz sintética: solo tipografía, sin nudo ni halo. Es el ancla
  // visual del quipu social, no un nodo del grafo.
  if (n.type === 'Root') {
    drawRootLabel(ctx, n, alpha, zoom)
    return
  }

  const [cr, cg, cb] = getNodeColor(n)

  const baseR = n.type === 'AreaHeader' ? 15
    : n.type === 'OrganizacionEstudiantil' ? 13
    : n.type === 'Club' ? 12
    : n.type === 'Actividad' ? 9
    : n.type === 'Carrera' ? 14
    : n.type === 'Departamento' ? 13
    : n.type === 'Laboratorio' ? 12
    : n.type === 'Curso' ? 11
    : n.type === 'Docente' ? 10
    : n.type === 'Proyecto' ? 9
    : n.type === 'Equipo' ? 7
    : 10

  const idlePhase = n.id.length * 1.37 + n.id.charCodeAt(0) * 0.41
  const idleBreath = 1 + Math.sin(t * 1.2 + idlePhase) * 0.018
  const pulse = idleBreath + ((hov || sel) ? Math.sin(t * 3) * 0.06 : 0)
  const R = baseR * pulse

  // LOD: at very low zoom, just draw a dot
  if (zoom < 0.25) {
    if (n.type === 'AreaHeader') {
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(n.x, n.y, Math.max(2, R * 0.4), 0, Math.PI * 2)
      ctx.stroke()
    } else {
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`
      ctx.beginPath()
      ctx.arc(n.x, n.y, Math.max(2, R * 0.4), 0, Math.PI * 2)
      ctx.fill()
    }
    return
  }

  // Selection halo — dithered ring
  if (sel) {
    const GS = 4
    for (let gx = n.x - 30; gx <= n.x + 30; gx += GS) {
      for (let gy = n.y - 30; gy <= n.y + 30; gy += GS) {
        const dx = gx - n.x, dy = gy - n.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < R + 2 || dist > R + 16) continue
        const threshold = 1 - (dist - R - 2) / 14
        const bx = ((Math.floor((gx - n.x + 30) / GS)) % 4 + 4) % 4
        const by = ((Math.floor((gy - n.y + 30) / GS)) % 4 + 4) % 4
        if (BAYER[by][bx] < threshold) {
          ctx.fillStyle = `rgba(${cr},${cg},${cb},0.38)`
          ctx.fillRect(gx, gy, 2, 2)
        }
      }
    }
  }

  ctx.save()
  ctx.translate(n.x, n.y)

  // LOD: at mid zoom, simplified knots
  if (zoom < 0.55) {
    if (n.type === 'AreaHeader') {
      // Nudo sintético: solo contorno
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha * 0.9})`
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.8})`
      ctx.fill()
    }
  } else {
    // Full detail knot shapes per type
    switch (n.type) {
      case 'AreaHeader':
        // Nudo agrupador sintético: círculo con contorno y punto central
        ctx.beginPath()
        ctx.arc(0, 0, R, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha * 0.9})`
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(0, 0, R * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.5})`
        ctx.fill()
        break
      case 'OrganizacionEstudiantil':
      case 'Club':
      case 'Carrera':
        drawKnotClub(ctx, R, cr, cg, cb, alpha, t, hov || sel)
        break
      case 'Actividad':
        drawKnotActividad(ctx, R, cr, cg, cb, alpha, t)
        break
      case 'Curso':
        drawKnotCurso(ctx, R, cr, cg, cb, alpha)
        break
      case 'Docente':
        drawKnotDocente(ctx, R, cr, cg, cb, alpha)
        break
      case 'Proyecto':
      case 'Laboratorio':
        drawKnotTesis(ctx, R, cr, cg, cb, alpha)
        break
      case 'Departamento':
      case 'GrupoInvestigacion':
        drawKnotDepartamento(ctx, R, cr, cg, cb, alpha)
        break
      default:
        ctx.beginPath()
        ctx.arc(0, 0, R, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.75})`
        ctx.fill()
    }
  }

  ctx.restore()

  // Label — skip at very low zoom
  if (zoom > 0.35) {
    const isHeader = n.type === 'AreaHeader'
    const labelRole = sel ? COLOR.labelSelected : COLOR.labelBase
    const ts = isHeader ? TEXT.areaHeader : TEXT.nodeLabel
    const sz = zoom > 0.7 ? ts.size : Math.round(ts.size * 0.8)
    ctx.font = composeFont(ts, sz)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = composeRgba(labelRole, isHeader ? Math.min(1, alpha * 1.1) : alpha)
    ctx.fillText(n.label, n.x, n.y + R + 6)
  }
}

// Raíz del quipu: tipografía "comunidad UTEC" centrada, sin svgs, sin
// imágenes. Es el ancla simbólica del grafo.
function drawRootLabel(
  ctx: CanvasRenderingContext2D,
  n: TNode, alpha: number, zoom: number,
) {
  if (zoom < 0.25) return
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const size = zoom > 0.8 ? TEXT.rootWordmark.size : zoom > 0.5 ? 24 : 18
  ctx.font = composeFont(TEXT.rootWordmark, size)
  ctx.fillStyle = composeRgba(COLOR.rootLabel, alpha)
  ctx.fillText(n.label, n.x, n.y - size * 0.05)
  // Línea decorativa debajo
  ctx.beginPath()
  ctx.moveTo(n.x - size * 1.6, n.y + size * 0.85)
  ctx.lineTo(n.x + size * 1.6, n.y + size * 0.85)
  ctx.strokeStyle = composeRgba(COLOR.rootLine, alpha * 0.55)
  ctx.lineWidth = 0.8
  ctx.stroke()
  ctx.restore()
}

function drawKnotActividad(
  ctx: CanvasRenderingContext2D, R: number,
  cr: number, cg: number, cb: number, alpha: number, t: number,
) {
  ctx.save()
  ctx.rotate(t * 0.05)
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2
    const r = i % 2 === 0 ? R : R * 0.55
    const x = Math.cos(ang) * r
    const y = Math.sin(ang) * r
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.78})`
  ctx.fill()
  ctx.restore()
}

// ─── Knot shape functions ───────────────────────────────────────

function drawKnotClub(
  ctx: CanvasRenderingContext2D, R: number,
  cr: number, cg: number, cb: number, alpha: number,
  t: number, active: boolean,
) {
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.85})`
  ctx.fill()

  // Inner fiber loop — figure-8
  ctx.beginPath()
  const w = R * 0.55, h2 = R * 0.38
  ctx.ellipse(-w * 0.3, -h2 * 0.3, w, h2, Math.PI * 0.22, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${Math.min(cr + 60, 255)},${Math.min(cg + 60, 255)},${Math.min(cb + 60, 255)},${alpha * 0.35})`
  ctx.lineWidth = 1.4
  ctx.stroke()

  // Center dot
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.28, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${Math.min(cr + 80, 255)},${Math.min(cg + 80, 255)},${Math.min(cb + 80, 255)},${alpha * 0.6})`
  ctx.fill()

  if (active) {
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + t * 0.4
      const r1 = R * 1.05, r2 = R * 1.55
      ctx.beginPath()
      ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1)
      ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2)
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.35)`
      ctx.lineWidth = 0.8
      ctx.stroke()
    }
  }
}

function drawKnotCurso(
  ctx: CanvasRenderingContext2D, R: number,
  cr: number, cg: number, cb: number, alpha: number,
) {
  ctx.save()
  ctx.scale(1, 0.75)
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.75})`
  ctx.fill()
  // Diamond inner pattern
  ctx.beginPath()
  ctx.moveTo(0, -R * 0.55); ctx.lineTo(R * 0.4, 0)
  ctx.lineTo(0, R * 0.55); ctx.lineTo(-R * 0.4, 0)
  ctx.closePath()
  ctx.strokeStyle = `rgba(${Math.min(cr + 70, 255)},${Math.min(cg + 70, 255)},${Math.min(cb + 70, 255)},${alpha * 0.4})`
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.restore()
}

function drawKnotDocente(
  ctx: CanvasRenderingContext2D, R: number,
  cr: number, cg: number, cb: number, alpha: number,
) {
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.55})`
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha * 0.9})`
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Cross
  ctx.beginPath()
  ctx.moveTo(-R * 0.55, 0); ctx.lineTo(R * 0.55, 0)
  ctx.moveTo(0, -R * 0.55); ctx.lineTo(0, R * 0.55)
  ctx.strokeStyle = `rgba(${Math.min(cr + 80, 255)},${Math.min(cg + 80, 255)},${Math.min(cb + 80, 255)},${alpha * 0.45})`
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawKnotTesis(
  ctx: CanvasRenderingContext2D, R: number,
  cr: number, cg: number, cb: number, alpha: number,
) {
  ctx.save()
  ctx.scale(1.35, 0.7)
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.72})`
  ctx.fill()
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(-R * 0.7, i * R * 0.22)
    ctx.lineTo(R * 0.7, i * R * 0.22)
    ctx.strokeStyle = `rgba(${Math.min(cr + 70, 255)},${Math.min(cg + 70, 255)},${Math.min(cb + 70, 255)},${alpha * 0.25})`
    ctx.lineWidth = 0.8
    ctx.stroke()
  }
  ctx.restore()
}

function drawKnotDepartamento(
  ctx: CanvasRenderingContext2D, R: number,
  cr: number, cg: number, cb: number, alpha: number,
) {
  // Hexagonal knot
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 - Math.PI / 6
    const px = Math.cos(ang) * R, py = Math.sin(ang) * R
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.7})`
  ctx.fill()
  ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha * 0.9})`
  ctx.lineWidth = 1.2
  ctx.stroke()
  // Inner circle
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.4, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${Math.min(cr + 60, 255)},${Math.min(cg + 60, 255)},${Math.min(cb + 60, 255)},${alpha * 0.4})`
  ctx.fill()
}
