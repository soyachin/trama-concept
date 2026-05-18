import { useEffect } from "react";
import p5 from "p5";
import * as d3 from "d3-force";
import type { TNode, TEdge } from "../../types/graph";
import { BG, BAYER } from "../../config/visuals";
import { initLayout } from "../../lib/layout";
import { drawRope, drawKnot, getWovenTexture, isInViewport, edgeInViewport } from "../../lib/render";

export interface SimulationState {
  time: number;
  panX: number;
  panY: number;
  zoom: number;
  selId: string | null;
  hovId: string | null;
  intro: "showing" | "dissolving" | "done";
  introSec: number;
  dissolve: number;
  dragging: boolean;
  dStartX: number;
  dStartY: number;
  dragNode: TNode | null;
  simulation: d3.Simulation<TNode, undefined> | null;
}

export function useGraphSimulation(
  containerRef: React.RefObject<HTMLDivElement | null>,
  nodes: TNode[],
  edges: TEdge[],
  searchRef: React.RefObject<string>,
  stateRef: React.MutableRefObject<SimulationState>,
) {
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;
    const s = stateRef.current;

    // Build lookup map for O(1) access
    const nodeMap = new Map<string, TNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    // Pre-build adjacency for fast connected-check
    const adj = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!adj.has(e.source)) adj.set(e.source, new Set());
      if (!adj.has(e.target)) adj.set(e.target, new Set());
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
    }

    const instance = new p5((p: p5) => {
      p.setup = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cnv = p.createCanvas(w, h);
        cnv.parent(containerRef.current!);
        p.randomSeed(42);
        initLayout(nodes, p.width, p.height);
        const links = edges
          .map((e) => {
            const src = nodeMap.get(e.source);
            const tgt = nodeMap.get(e.target);
            if (!src || !tgt) return null;
            return { source: src, target: tgt };
          })
          .filter(Boolean) as { source: TNode; target: TNode }[];

        // Tuned force params for large graph
        const chargeStr = nodes.length > 500 ? -120 : nodes.length > 100 ? -250 : -400;
        const linkDist = nodes.length > 500 ? 80 : 120;

        s.simulation = d3
          .forceSimulation(nodes)
          .force("link", d3.forceLink(links).distance(linkDist).strength(0.008))
          .force("charge", d3.forceManyBody().strength(chargeStr).distanceMax(600))
          .force("center", d3.forceCenter(p.width / 2, p.height / 2))
          .force("collide", d3.forceCollide(12))
          .alphaDecay(0.025);
        s.simulation.on("tick", () => {});
      };

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
      };

      p.draw = () => {
        s.time += 0.004;
        const dt = (p as unknown as { deltaTime: number }).deltaTime;
        s.introSec += dt ? dt / 1000 : 0.016;

        const ctx = p.drawingContext as CanvasRenderingContext2D;
        const w = p.width, h = p.height;

        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, w, h);

        // Woven texture background (pre-rendered, cheap blit)
        const wovenTex = getWovenTexture(w, h);
        ctx.drawImage(wovenTex, 0, 0);

        ctx.save();
        ctx.translate(s.panX + w / 2, s.panY + h / 2);
        ctx.scale(s.zoom, s.zoom);
        ctx.translate(-w / 2, -h / 2);

        // Compute viewport bounds in graph space for culling
        const invZoom = 1 / s.zoom;
        const vx1 = (0 - s.panX - w / 2) * invZoom + w / 2;
        const vy1 = (0 - s.panY - h / 2) * invZoom + h / 2;
        const vx2 = (w - s.panX - w / 2) * invZoom + w / 2;
        const vy2 = (h - s.panY - h / 2) * invZoom + h / 2;
        const margin = 60; // extra margin for labels/halos

        const q = searchRef.current.toLowerCase().trim();

        // Draw edges (with viewport culling)
        for (const e of edges) {
          const src = nodeMap.get(e.source);
          const tgt = nodeMap.get(e.target);
          if (!src || !tgt) continue;

          // Viewport culling for edges
          if (!edgeInViewport(src, tgt, margin, vx1, vy1, vx2, vy2)) continue;

          const active =
            s.hovId === e.source ||
            s.hovId === e.target ||
            s.selId === e.source ||
            s.selId === e.target;
          const mSrc =
            !q ||
            src.label.toLowerCase().includes(q) ||
            src.tags.some((t) => t.includes(q));
          const mTgt =
            !q ||
            tgt.label.toLowerCase().includes(q) ||
            tgt.tags.some((t) => t.includes(q));
          let a = 0.11;
          if (active) a = 0.82;
          else if (s.hovId || s.selId) a = 0.04;
          if (q && !mSrc && !mTgt) a = 0.025;
          drawRope(ctx, e, src, tgt, s.time, a, active, s.zoom);
        }

        // Draw nodes (with viewport culling)
        for (const n of nodes) {
          // Viewport culling
          if (!isInViewport(n.x, n.y, margin, vx1, vy1, vx2, vy2)) continue;

          const hov = n.id === s.hovId;
          const sel = n.id === s.selId;
          const match =
            !q ||
            n.label.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q)) ||
            n.description.toLowerCase().includes(q);
          let a = 0.92;
          if ((s.hovId || s.selId) && !hov && !sel) {
            const connected = adj.get(s.selId ?? s.hovId ?? '')?.has(n.id) ?? false;
            a = connected ? 0.75 : 0.2;
          }
          if (q && !match) a = 0.07;
          drawKnot(ctx, n, s.time, hov, sel, a, s.zoom);
        }

        ctx.restore();

        if (s.intro !== "done") {
          if (s.intro === "showing" && s.introSec > 4) s.intro = "dissolving";
          renderIntro(ctx, w, h);
        }
      };

      function renderIntro(
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
      ) {
        if (s.intro === "showing") {
          ctx.fillStyle = "rgba(15,14,11,0.92)";
          ctx.fillRect(0, 0, w, h);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#f0ede4";
          ctx.font = `italic 21px 'Cormorant Garamond', Georgia, serif`;
          ctx.fillText(
            '"Trama es el mapa de lo que tu universidad ya sabe,',
            w / 2,
            h / 2 - 24,
          );
          ctx.fillText('pero nunca te dijo."', w / 2, h / 2 + 10);
          ctx.font = `12px 'Space Mono', 'Courier New', monospace`;
          ctx.fillStyle = "rgba(240,237,228,0.48)";
          ctx.fillText(
            "Explora. Cada nodo es una puerta. Cada arista, una conversación pendiente.",
            w / 2,
            h / 2 + 50,
          );
          ctx.font = `10px 'Space Mono', monospace`;
          ctx.fillStyle = `rgba(200,117,58,0.65)`;
          ctx.fillText("[ click para comenzar ]", w / 2, h / 2 + 84);
        } else if (s.intro === "dissolving") {
          s.dissolve += 0.022;
          if (s.dissolve >= 1) {
            s.intro = "done";
            return;
          }
          const TILE = 7;
          ctx.fillStyle = "rgba(15,14,11,0.95)";
          for (let tx = 0; tx < w; tx += TILE) {
            for (let ty = 0; ty < h; ty += TILE) {
              const bx = Math.floor(tx / TILE) % 4;
              const by = Math.floor(ty / TILE) % 4;
              if (s.dissolve < BAYER[by][bx]) ctx.fillRect(tx, ty, TILE, TILE);
            }
          }
          const ta = Math.max(0, 1 - s.dissolve * 5);
          if (ta > 0) {
            ctx.fillStyle = `rgba(240,237,228,${ta})`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `italic 21px 'Cormorant Garamond', Georgia, serif`;
            ctx.fillText(
              '"Trama es el mapa de lo que tu universidad ya sabe,',
              w / 2,
              h / 2 - 24,
            );
            ctx.fillText('pero nunca te dijo."', w / 2, h / 2 + 10);
          }
        }
      }
    }, containerRef.current!);

    return () => instance.remove();
  }, [containerRef, nodes, edges, searchRef, stateRef]);
}
