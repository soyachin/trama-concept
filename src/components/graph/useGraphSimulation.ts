import { useEffect, useRef } from "react";
import p5 from "p5";
import * as d3 from "d3-force";
import type { TNode, TEdge } from "../../types/graph";
import { BG, NODE_VISUALS, DEFAULT_VISUAL, BAYER } from "../../config/visuals";
import { initLayout } from "../../lib/layout";
import { drawNode, drawEdge } from "../../lib/render";

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
  const p5Ref = useRef<p5 | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const s = stateRef.current;

    const instance = new p5((p: p5) => {
      p.setup = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cnv = p.createCanvas(w, h);
        cnv.parent(containerRef.current!);
        p.randomSeed(42);
        initLayout(nodes, p.width, p.height);
        const links = edges.map((e) => ({
          source: nodes.find((n) => n.id === e.source)!,
          target: nodes.find((n) => n.id === e.target)!,
        }));
        s.simulation = d3
          .forceSimulation(nodes)
          .force("link", d3.forceLink(links).distance(120).strength(0.012))
          .force("charge", d3.forceManyBody().strength(-400))
          .force("center", d3.forceCenter(p.width / 2, p.height / 2))
          .force("collide", d3.forceCollide(20))
          .alphaDecay(0.02);
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

        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, p.width, p.height);

        ctx.save();
        ctx.translate(s.panX + p.width / 2, s.panY + p.height / 2);
        ctx.scale(s.zoom, s.zoom);
        ctx.translate(-p.width / 2, -p.height / 2);

        const q = searchRef.current.toLowerCase().trim();

        for (const e of edges) {
          const src = nodes.find((n) => n.id === e.source);
          const tgt = nodes.find((n) => n.id === e.target);
          if (!src || !tgt) continue;
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
          drawEdge(ctx, e, src, tgt, s.time, a, active);
        }

        for (const n of nodes) {
          const vis = NODE_VISUALS[n.type] ?? DEFAULT_VISUAL;
          const hov = n.id === s.hovId;
          const sel = n.id === s.selId;
          const match =
            !q ||
            n.label.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q)) ||
            n.description.toLowerCase().includes(q);
          let a = 0.92;
          if ((s.hovId || s.selId) && !hov && !sel) a = 0.22;
          if (q && !match) a = 0.07;
          drawNode(p, ctx, n, vis, s.time, hov, sel, a);
        }

        ctx.restore();

        if (s.intro !== "done") {
          if (s.intro === "showing" && s.introSec > 4) s.intro = "dissolving";
          renderIntro(ctx, p.width, p.height);
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

    p5Ref.current = instance;
    return () => instance.remove();
  }, [containerRef, nodes, edges, searchRef, stateRef]);

  return p5Ref;
}
