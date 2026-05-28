import { useEffect, useRef } from "react"
import p5 from "p5"
import * as d3 from "d3-force"
import type { TNode } from "../../types/graph"
import type { ExplorationSession } from "../../types/graph"
import { BAYER, NODE_VISUALS, DEFAULT_VISUAL } from "../../config/visuals"
import { TEXT, composeFont, COLOR, composeRgba } from "../../config/typography"
import { initLayout } from "../../lib/layout"
import { drawRope, drawKnot, getWovenTexture, isInViewport, edgeInViewport } from "../../lib/render"

// ─── Protocolo React ↔ p5 ────────────────────────────────────────
// Toda comunicación de React hacia p5 pasa por este tipo.
// p5 recibe los refs que necesita para leer datos performance‑sensitive
// (cámara, grafo, simulación) y callbacks para notificar eventos que
// React necesita para actualizar el UI (selección de nodo).
//
// Flujo:
//   React state (quipuId, panelNode)
//        │
//   useQuipuSession → sessionRef (mutable, p5 lee cada frame)
//        │
//   P5CanvasConfig → useGraphSimulation
//        │
//   p5 draw loop ← sessionRef (nodes, edges, camera)
//   p5 event handlers → onNodeSelect / onNodeHover → React setState
//        │
//   setPanelNode → React re‑render → InfoPanel

export interface P5CanvasConfig {
  containerRef: React.RefObject<HTMLDivElement | null>
  sessionRef: React.MutableRefObject<ExplorationSession>
  searchRef: React.RefObject<string>
  onNodeSelect: (node: TNode | null) => void
  onNodeHover: (nodeId: string | null) => void
  dataVersion: number
  isMobile: boolean
}

// ─── Interaction constants ────────────────────────────────────────
const IDLE_ALPHA = 0.008
const DRAG_ALPHA = 0.35
const MIN_ZOOM = 0.22
const MAX_ZOOM = 3.8
const DRAG_THRESHOLD = 5
const TOUCH_TAP_THRESHOLD = 25
const FLY_TO_DURATION = 400
const FLY_TO_ZOOM = 1.4

function toGraph(
  mx: number, my: number,
  s: ExplorationSession,
  width: number, height: number,
): [number, number] {
  return [
    (mx - s.camera.panX - width / 2) / s.camera.zoom + width / 2,
    (my - s.camera.panY - height / 2) / s.camera.zoom + height / 2,
  ]
}

function hitTest(
  mx: number, my: number,
  nodes: TNode[],
  s: ExplorationSession,
  canvasW: number, canvasH: number,
): TNode | null {
  const [gx, gy] = toGraph(mx, my, s, canvasW, canvasH)
  for (const n of nodes) {
    const visual = NODE_VISUALS[n.type] ?? DEFAULT_VISUAL
    const hitRadius = Math.max(10 / s.camera.zoom, visual.baseRadius * 1.4)
    const dx = gx - n.x, dy = gy - n.y
    if (dx * dx + dy * dy < hitRadius * hitRadius) return n
  }
  return null
}

function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))
}

function flyTo(
  s: ExplorationSession,
  targetNode: TNode,
  canvasW: number,
  canvasH: number,
  isMobile = false,
) {
  const startPanX = s.camera.panX
  const startPanY = s.camera.panY
  const startZoom = s.camera.zoom

  const visibleCenterY = isMobile ? canvasH * 0.3 : canvasH / 2

  const endPanX = -(targetNode.x - canvasW / 2) * FLY_TO_ZOOM
  const endPanY = -(targetNode.y - visibleCenterY) * FLY_TO_ZOOM
  const endZoom = FLY_TO_ZOOM

  const startTime = performance.now()

  function step() {
    const elapsed = performance.now() - startTime
    const t = Math.min(1, elapsed / FLY_TO_DURATION)
    const ease = 1 - (1 - t) * (1 - t)

    s.camera.panX = startPanX + (endPanX - startPanX) * ease
    s.camera.panY = startPanY + (endPanY - startPanY) * ease
    s.camera.zoom = startZoom + (endZoom - startZoom) * ease

    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export function useGraphSimulation(config: P5CanvasConfig) {
  const { containerRef, sessionRef, searchRef, onNodeSelect, onNodeHover, dataVersion, isMobile } = config

  const onNodeSelectRef = useRef(onNodeSelect)
  const onNodeHoverRef = useRef(onNodeHover)
  const isMobileRef = useRef(isMobile)
  useEffect(() => {
    onNodeSelectRef.current = onNodeSelect
    onNodeHoverRef.current = onNodeHover
    isMobileRef.current = isMobile
  })

  useEffect(() => {
    if (!containerRef.current) return
    const session = sessionRef.current
    const nodes = session.nodes
    const edges = session.edges
    if (nodes.length === 0) return

    const nodeMap = new Map<string, TNode>()
    for (const n of nodes) nodeMap.set(n.id, n)

    const adj = new Map<string, Set<string>>()
    for (const e of edges) {
      if (!adj.has(e.source)) adj.set(e.source, new Set())
      if (!adj.has(e.target)) adj.set(e.target, new Set())
      adj.get(e.source)!.add(e.target)
      adj.get(e.target)!.add(e.source)
    }

    // ─── p5 canvas ──────────────────────────────────────────────
    const instance = new p5((p: p5) => {
      p.setup = () => {
        const w = window.innerWidth
        const h = window.innerHeight
        const cnv = p.createCanvas(w, h)
        cnv.parent(containerRef.current!)
        p.randomSeed(42)
        initLayout(nodes, p.width, p.height)
        const links = edges
          .map((e) => {
            const src = nodeMap.get(e.source)
            const tgt = nodeMap.get(e.target)
            if (!src || !tgt) return null
            return { source: src, target: tgt }
          })
          .filter(Boolean) as { source: TNode; target: TNode }[]

        const hasSynthetic = nodes.some(n => n.synthetic)

        const chargeStr = hasSynthetic
          ? -180
          : nodes.length > 500 ? -120 : nodes.length > 100 ? -250 : -400
        const linkDist = hasSynthetic ? 70 : nodes.length > 500 ? 80 : 120
        const linkStr = hasSynthetic ? 0.04 : 0.008

        const sim = d3
          .forceSimulation(nodes)
          .force("link", d3.forceLink(links).distance(linkDist).strength(linkStr))
          .force("charge", d3.forceManyBody().strength(chargeStr).distanceMax(600))
          .force("collide", d3.forceCollide(14))
          .alphaDecay(0.018)
          .alphaMin(0)
          .alphaTarget(0.008)
          .velocityDecay(0.42)
        sim.force("center", d3.forceCenter(p.width / 2, p.height / 2))
        sim.on("tick", () => {})
        session.simulation = sim
      }

      function onDprChange() {
        const dpr = Math.ceil(window.devicePixelRatio) || 1
        p.pixelDensity(dpr)
        matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
          .addEventListener("change", onDprChange, { once: true })
      }
      matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
        .addEventListener("change", onDprChange, { once: true })

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight)
      }

      p.draw = () => {
        const s = sessionRef.current
        s.time += 0.004
        const dt = (p as unknown as { deltaTime: number }).deltaTime
        s.introSec += dt ? dt / 1000 : 0.016

        const ctx = p.drawingContext as CanvasRenderingContext2D
        const w = p.width, h = p.height

        ctx.fillStyle = composeRgba(COLOR.canvasBg)
        ctx.fillRect(0, 0, w, h)

        const dpr = Math.ceil(window.devicePixelRatio) || 1
        const wovenTex = getWovenTexture(w, h, dpr)
        ctx.drawImage(wovenTex, 0, 0, w, h)

        ctx.save()
        ctx.translate(s.camera.panX + w / 2, s.camera.panY + h / 2)
        ctx.scale(s.camera.zoom, s.camera.zoom)
        ctx.translate(-w / 2, -h / 2)

        const invZoom = 1 / s.camera.zoom
        const vx1 = (0 - s.camera.panX - w / 2) * invZoom + w / 2
        const vy1 = (0 - s.camera.panY - h / 2) * invZoom + h / 2
        const vx2 = (w - s.camera.panX - w / 2) * invZoom + w / 2
        const vy2 = (h - s.camera.panY - h / 2) * invZoom + h / 2
        const margin = 60

        const q = searchRef.current.toLowerCase().trim()

        for (const e of s.edges) {
          const src = nodeMap.get(e.source)
          const tgt = nodeMap.get(e.target)
          if (!src || !tgt) continue

          if (!edgeInViewport(src, tgt, margin, vx1, vy1, vx2, vy2)) continue

          const active =
            s.hovId === e.source ||
            s.hovId === e.target ||
            s.selId === e.source ||
            s.selId === e.target
          const mSrc =
            !q ||
            src.label.toLowerCase().includes(q) ||
            src.tags.some((t) => t.includes(q))
          const mTgt =
            !q ||
            tgt.label.toLowerCase().includes(q) ||
            tgt.tags.some((t) => t.includes(q))
          let a = 0.11
          if (active) a = 0.82
          else if (s.hovId || s.selId) a = 0.04
          if (q && !mSrc && !mTgt) a = 0.025
          drawRope(ctx, e, src, tgt, s.time, a, active, s.camera.zoom)
        }

        for (const n of s.nodes) {
          if (!isInViewport(n.x, n.y, margin, vx1, vy1, vx2, vy2)) continue

          const hov = n.id === s.hovId
          const sel = n.id === s.selId
          const match =
            !q ||
            n.label.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q)) ||
            n.description.toLowerCase().includes(q)
          let a = 0.92
          if ((s.hovId || s.selId) && !hov && !sel) {
            const connected = adj.get(s.selId ?? s.hovId ?? "")?.has(n.id) ?? false
            a = connected ? 0.75 : 0.2
          }
          if (q && !match) a = 0.07
          drawKnot(ctx, n, s.time, hov, sel, a, s.camera.zoom)
        }

        ctx.restore()

        if (s.intro !== "done") {
          if (s.intro === "showing" && s.introSec > 4) s.intro = "dissolving"
          renderIntro(ctx, w, h)
        }
      }

      function renderIntro(
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
      ) {
        const s = sessionRef.current
        const isMobileIntro = isMobileRef.current
        const quoteSize = isMobileIntro ? Math.max(16, TEXT.introQuote.size * 0.7) : TEXT.introQuote.size
        const subSize = isMobileIntro ? Math.max(11, TEXT.introSub.size * 0.8) : TEXT.introSub.size
        const ctaSize = isMobileIntro ? Math.max(10, TEXT.introCta.size * 0.85) : TEXT.introCta.size

        if (s.intro === "showing") {
          ctx.fillStyle = composeRgba(COLOR.introBg)
          ctx.fillRect(0, 0, w, h)
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillStyle = composeRgba(COLOR.introText)
          ctx.font = composeFont(TEXT.introQuote, quoteSize)

          if (isMobileIntro) {
            ctx.fillText('"Trama es el mapa', w / 2, h / 2 - 40)
            ctx.fillText('de lo que tu universidad', w / 2, h / 2 - 16)
            ctx.fillText('ya sabe, pero nunca te dijo."', w / 2, h / 2 + 8)
          } else {
            ctx.fillText(
              '"Trama es el mapa de lo que tu universidad ya sabe,',
              w / 2,
              h / 2 - 24,
            )
            ctx.fillText('pero nunca te dijo."', w / 2, h / 2 + 10)
          }

          ctx.font = composeFont(TEXT.introSub, subSize)
          ctx.fillStyle = composeRgba(COLOR.introSub)

          if (isMobileIntro) {
            ctx.fillText("Explora. Cada nodo es una puerta.", w / 2, h / 2 + 44)
            ctx.fillText("Cada arista, una conversación pendiente.", w / 2, h / 2 + 64)
          } else {
            ctx.fillText(
              "Explora. Cada nodo es una puerta. Cada arista, una conversación pendiente.",
              w / 2,
              h / 2 + 50,
            )
          }

          ctx.font = composeFont(TEXT.introCta, ctaSize)
          ctx.fillStyle = composeRgba(COLOR.introCta)
          ctx.fillText("[ toca para comenzar ]", w / 2, h / 2 + (isMobileIntro ? 100 : 84))
        } else if (s.intro === "dissolving") {
          s.dissolve += 0.022
          if (s.dissolve >= 1) {
            s.intro = "done"
            return
          }
          const TILE = 7
          ctx.fillStyle = composeRgba(COLOR.dissolveBg)
          for (let tx = 0; tx < w; tx += TILE) {
            for (let ty = 0; ty < h; ty += TILE) {
              const bx = Math.floor(tx / TILE) % 4
              const by = Math.floor(ty / TILE) % 4
              if (s.dissolve < (BAYER[by]?.[bx] ?? 0)) ctx.fillRect(tx, ty, TILE, TILE)
            }
          }
          const ta = Math.max(0, 1 - s.dissolve * 5)
          if (ta > 0) {
            ctx.fillStyle = composeRgba(COLOR.introText, ta)
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.font = composeFont(TEXT.introQuote, quoteSize)

            if (isMobileIntro) {
              ctx.fillText('"Trama es el mapa', w / 2, h / 2 - 40)
              ctx.fillText('de lo que tu universidad', w / 2, h / 2 - 16)
              ctx.fillText('ya sabe, pero nunca te dijo."', w / 2, h / 2 + 8)
            } else {
              ctx.fillText(
                '"Trama es el mapa de lo que tu universidad ya sabe,',
                w / 2,
                h / 2 - 24,
              )
              ctx.fillText('pero nunca te dijo."', w / 2, h / 2 + 10)
            }
          }
        }
      }
    }, containerRef.current!)

    // ─── DOM interactions (antes en useGraphInteraction) ──────────
    const el = containerRef.current
    const prevMouseRef = { x: 0, y: 0 }
    const nodeDragActiveRef = { current: false }

    const getCanvasEl = () => el.querySelector("canvas")

    const canvasCoords = (e: MouseEvent): [number, number] => {
      const cv = getCanvasEl()
      if (!cv) return [e.clientX, e.clientY]
      const rect = cv.getBoundingClientRect()
      return [
        ((e.clientX - rect.left) / rect.width) * cv.clientWidth,
        ((e.clientY - rect.top) / rect.height) * cv.clientHeight,
      ]
    }

    const touchCoords = (t: Touch): [number, number] => {
      const cv = getCanvasEl()
      if (!cv) return [t.clientX, t.clientY]
      const rect = cv.getBoundingClientRect()
      return [
        ((t.clientX - rect.left) / rect.width) * cv.clientWidth,
        ((t.clientY - rect.top) / rect.height) * cv.clientHeight,
      ]
    }

    const onMouseMove = (e: MouseEvent) => {
      const s = sessionRef.current
      if (s.intro !== "done") return
      if (s.dragNode || s.dragging) return
      const [mx, my] = canvasCoords(e)
      const cv = getCanvasEl()
      if (!cv) return
      const n = hitTest(mx, my, s.nodes, s, cv.clientWidth, cv.clientHeight)
      s.hovId = n ? n.id : null
      onNodeHoverRef.current(n ? n.id : null)
      el.style.cursor = n ? "pointer" : "grab"
    }

    const onMouseDown = (e: MouseEvent) => {
      const s = sessionRef.current
      if (s.intro !== "done") {
        s.intro = "dissolving"
        return
      }
      const [mx, my] = canvasCoords(e)
      prevMouseRef.x = mx
      prevMouseRef.y = my
      const cv = getCanvasEl()
      if (!cv) return
      const n = hitTest(mx, my, s.nodes, s, cv.clientWidth, cv.clientHeight)
      if (n) {
        s.dragNode = n
        n.fx = n.x
        n.fy = n.y
        s.dStartX = mx
        s.dStartY = my
        nodeDragActiveRef.current = false
        const sim = s.simulation as import("d3-force").Simulation<TNode, undefined>
        sim?.alphaTarget(DRAG_ALPHA).restart()
      } else {
        s.dragging = false
        s.dStartX = mx
        s.dStartY = my
        el.style.cursor = "grabbing"
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      const s = sessionRef.current
      if (s.intro !== "done") return
      const [mx, my] = canvasCoords(e)

      if (s.dragNode) {
        s.dragNode.fx = null
        s.dragNode.fy = null
        const sim = s.simulation as import("d3-force").Simulation<TNode, undefined>
        sim?.alpha(0.3).alphaTarget(IDLE_ALPHA).restart()
        const wasDragged = nodeDragActiveRef.current
        const releasedNode = s.dragNode
        s.dragNode = null
        nodeDragActiveRef.current = false

        if (!wasDragged) {
          if (s.selId === releasedNode.id) {
            s.selId = null
            onNodeSelectRef.current(null)
          } else {
            s.selId = releasedNode.id
            onNodeSelectRef.current(releasedNode)
            const cv = getCanvasEl()
            if (cv) flyTo(s, releasedNode, cv.clientWidth, cv.clientHeight)
          }
        }
      } else {
        if (!s.dragging) {
          const cv = getCanvasEl()
          if (!cv) return
          const n = hitTest(mx, my, s.nodes, s, cv.clientWidth, cv.clientHeight)
          if (n) {
            if (s.selId === n.id) {
              s.selId = null
              onNodeSelectRef.current(null)
            } else {
              s.selId = n.id
              onNodeSelectRef.current(n)
              flyTo(s, n, cv.clientWidth, cv.clientHeight)
            }
          } else {
            s.selId = null
            onNodeSelectRef.current(null)
          }
        }
        s.dragging = false
        el.style.cursor = "grab"
      }
    }

    const onDrag = (e: MouseEvent) => {
      const s = sessionRef.current
      if (s.intro !== "done") return
      if (!(e.buttons & 1)) return
      const [mx, my] = canvasCoords(e)
      const movedX = mx - prevMouseRef.x
      const movedY = my - prevMouseRef.y
      prevMouseRef.x = mx
      prevMouseRef.y = my

      if (s.dragNode) {
        if (!nodeDragActiveRef.current) {
          const dx = mx - s.dStartX
          const dy = my - s.dStartY
          if (Math.hypot(dx || movedX, dy || movedY) > DRAG_THRESHOLD) {
            nodeDragActiveRef.current = true
          }
        }
        if (nodeDragActiveRef.current) {
          s.dragNode.fx! += movedX / s.camera.zoom
          s.dragNode.fy! += movedY / s.camera.zoom
          s.dragNode.x = s.dragNode.fx!
          s.dragNode.y = s.dragNode.fy!
          el.style.cursor = "grabbing"
        }
      } else {
        const dx = mx - s.dStartX
        const dy = my - s.dStartY
        if (!s.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          s.dragging = true
        }
        if (s.dragging) {
          s.camera.panX += movedX
          s.camera.panY += movedY
          el.style.cursor = "grabbing"
        }
      }
    }

    const onWheel = (e: WheelEvent) => {
      const s = sessionRef.current
      if (s.intro !== "done") return
      e.preventDefault()
      const [mx, my] = canvasCoords(e)
      const cv = getCanvasEl()
      if (!cv) return

      const oldZoom = s.camera.zoom
      const delta = -e.deltaY * 0.001
      s.camera.zoom = clampZoom(s.camera.zoom + delta)
      const scale = s.camera.zoom / oldZoom

      s.camera.panX = mx - scale * (mx - s.camera.panX)
      s.camera.panY = my - scale * (my - s.camera.panY)
    }

    const onDblClick = (e: MouseEvent) => {
      const s = sessionRef.current
      if (s.intro !== "done") return
      e.preventDefault()
      const [mx, my] = canvasCoords(e)
      const cv = getCanvasEl()
      if (!cv) return
      const n = hitTest(mx, my, s.nodes, s, cv.clientWidth, cv.clientHeight)
      if (n) {
        s.selId = n.id
        onNodeSelectRef.current(n)
        flyTo(s, n, cv.clientWidth, cv.clientHeight)
      }
    }

    // Touch state
    let lastTouchDist = 0
    let lastTouchX = 0
    let lastTouchY = 0
    let touchDragNode: TNode | null = null
    let touchStartX = 0
    let touchStartY = 0
    let touchIsPan = false
    let touchMoved = false

    const onTouchStart = (e: TouchEvent) => {
      const s = sessionRef.current
      if (s.intro !== "done") {
        s.intro = "dissolving"
        return
      }
      if (e.touches.length === 2) {
        touchDragNode = null
        const t0 = e.touches[0]!, t1 = e.touches[1]!
        const dx = t1.clientX - t0.clientX
        const dy = t1.clientY - t0.clientY
        lastTouchDist = Math.hypot(dx, dy)
        lastTouchX = (t0.clientX + t1.clientX) / 2
        lastTouchY = (t0.clientY + t1.clientY) / 2
      } else if (e.touches.length === 1) {
        const t = e.touches[0]!
        const [mx, my] = touchCoords(t)
        touchStartX = mx
        touchStartY = my
        touchMoved = false
        const cv = getCanvasEl()
        const n = cv
          ? hitTest(mx, my, s.nodes, s, cv.clientWidth, cv.clientHeight)
          : null
        if (n) {
          touchDragNode = n
          n.fx = n.x
          n.fy = n.y
          touchIsPan = false
          const sim = s.simulation as import("d3-force").Simulation<TNode, undefined>
          sim?.alphaTarget(DRAG_ALPHA).restart()
          e.preventDefault()
        } else {
          touchDragNode = null
          touchIsPan = true
          lastTouchX = t.clientX
          lastTouchY = t.clientY
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      const s = sessionRef.current
      if (s.intro !== "done") return

      if (e.touches.length === 2) {
        e.preventDefault()
        const t0 = e.touches[0]!, t1 = e.touches[1]!
        const dx = t1.clientX - t0.clientX
        const dy = t1.clientY - t0.clientY
        const dist = Math.hypot(dx, dy)
        const cx = (t0.clientX + t1.clientX) / 2
        const cy = (t0.clientY + t1.clientY) / 2

        if (lastTouchDist > 0) {
          const scale = dist / lastTouchDist
          s.camera.zoom = clampZoom(s.camera.zoom * scale)
        }

        s.camera.panX += cx - lastTouchX
        s.camera.panY += cy - lastTouchY

        lastTouchDist = dist
        lastTouchX = cx
        lastTouchY = cy
      } else if (e.touches.length === 1) {
        const t = e.touches[0]!
        const [mx, my] = touchCoords(t)
        const deltaX = t.clientX - lastTouchX
        const deltaY = t.clientY - lastTouchY

        const totalDx = mx - touchStartX
        const totalDy = my - touchStartY
        const totalDist = Math.hypot(totalDx, totalDy)

        if (!touchMoved && totalDist > TOUCH_TAP_THRESHOLD) {
          touchMoved = true
        }

        if (touchMoved) {
          if (touchDragNode) {
            e.preventDefault()
            touchDragNode.fx! += deltaX / s.camera.zoom
            touchDragNode.fy! += deltaY / s.camera.zoom
            touchDragNode.x = touchDragNode.fx!
            touchDragNode.y = touchDragNode.fy!
          } else if (touchIsPan) {
            e.preventDefault()
            s.camera.panX += deltaX
            s.camera.panY += deltaY
          }
        }

        lastTouchX = t.clientX
        lastTouchY = t.clientY
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      const s = sessionRef.current
      if (s.intro !== "done") return

      let totalDist = 0
      if (e.changedTouches.length > 0) {
        const t = e.changedTouches[0]!
        const [mx, my] = touchCoords(t)
        totalDist = Math.hypot(mx - touchStartX, my - touchStartY)
      }

      const isTap = !touchMoved || totalDist < TOUCH_TAP_THRESHOLD

      if (touchDragNode) {
        touchDragNode.fx = null
        touchDragNode.fy = null
        const sim = s.simulation as import("d3-force").Simulation<TNode, undefined>
        sim?.alpha(0.3).alphaTarget(IDLE_ALPHA).restart()
      }

      if (e.changedTouches.length === 1 && e.touches.length === 0 && isTap) {
        const t = e.changedTouches[0]!
        const [mx, my] = touchCoords(t)
        const cv = getCanvasEl()
        const n = cv
          ? hitTest(mx, my, s.nodes, s, cv.clientWidth, cv.clientHeight)
          : null
        if (n) {
          if (s.selId === n.id) {
            s.selId = null
            onNodeSelectRef.current(null)
          } else {
            s.selId = n.id
            onNodeSelectRef.current(n)
            if (cv) flyTo(s, n, cv.clientWidth, cv.clientHeight, true)
          }
        } else {
          s.selId = null
          onNodeSelectRef.current(null)
        }
      }

      touchDragNode = null
      touchIsPan = false
      touchMoved = false
    }

    el.addEventListener("mousemove", onMouseMove)
    el.addEventListener("mousedown", onMouseDown)
    el.addEventListener("mouseup", onMouseUp)
    el.addEventListener("mousemove", onDrag)
    el.addEventListener("dblclick", onDblClick)
    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("touchstart", onTouchStart, { passive: false })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      const sim = sessionRef.current.simulation as d3.Simulation<TNode, undefined>
      sim?.stop()
      sessionRef.current.simulation = null
      instance.remove()

      el.removeEventListener("mousemove", onMouseMove)
      el.removeEventListener("mousedown", onMouseDown)
      el.removeEventListener("mouseup", onMouseUp)
      el.removeEventListener("mousemove", onDrag)
      el.removeEventListener("dblclick", onDblClick)
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [containerRef, sessionRef, searchRef, dataVersion])
}
