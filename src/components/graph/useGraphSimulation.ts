import { useEffect } from "react";
import p5 from "p5";
import * as d3 from "d3-force";
import type { TNode } from "../../types/graph";
import type { ExplorationSession } from "../../types/graph";
import { BAYER } from "../../config/visuals";
import { TEXT, composeFont, COLOR, composeRgba } from "../../config/typography";
import { initLayout } from "../../lib/layout";
import { drawRope, drawKnot, getWovenTexture, isInViewport, edgeInViewport } from "../../lib/render";

export function useGraphSimulation(
  containerRef: React.RefObject<HTMLDivElement | null>,
  sessionRef: React.MutableRefObject<ExplorationSession>,
  searchRef: React.RefObject<string>,
  dataVersion: number,
) {
  useEffect(() => {
    if (!containerRef.current) return;
    const session = sessionRef.current;
    const nodes = session.nodes;
    const edges = session.edges;
    if (nodes.length === 0) return;

    const nodeMap = new Map<string, TNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

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

        const hasSynthetic = nodes.some(n => n.synthetic);

        const chargeStr = hasSynthetic
          ? -180
          : nodes.length > 500 ? -120 : nodes.length > 100 ? -250 : -400;
        const linkDist = hasSynthetic
          ? 70
          : nodes.length > 500 ? 80 : 120;
        const linkStr = hasSynthetic ? 0.04 : 0.008;

        const sim = d3
          .forceSimulation(nodes)
          .force("link", d3.forceLink(links).distance(linkDist).strength(linkStr))
          .force("charge", d3.forceManyBody().strength(chargeStr).distanceMax(600))
          .force("collide", d3.forceCollide(14))
          .alphaDecay(0.018)
          .alphaMin(0)
          .alphaTarget(0.008)
          .velocityDecay(0.42);
        sim.force("center", d3.forceCenter(p.width / 2, p.height / 2));
        sim.on("tick", () => {});
        session.simulation = sim;
      };

      function onDprChange() {
        const dpr = Math.ceil(window.devicePixelRatio) || 1;
        p.pixelDensity(dpr);
        matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
          .addEventListener('change', onDprChange, { once: true });
      }
      matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
        .addEventListener('change', onDprChange, { once: true });

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
      };

      p.draw = () => {
        const s = sessionRef.current;
        s.time += 0.004;
        const dt = (p as unknown as { deltaTime: number }).deltaTime;
        s.introSec += dt ? dt / 1000 : 0.016;

        const ctx = p.drawingContext as CanvasRenderingContext2D;
        const w = p.width, h = p.height;

        ctx.fillStyle = composeRgba(COLOR.canvasBg);
        ctx.fillRect(0, 0, w, h);

        const dpr = Math.ceil(window.devicePixelRatio) || 1;
        const wovenTex = getWovenTexture(w, h, dpr);
        ctx.drawImage(wovenTex, 0, 0, w, h);

        ctx.save();
        ctx.translate(s.camera.panX + w / 2, s.camera.panY + h / 2);
        ctx.scale(s.camera.zoom, s.camera.zoom);
        ctx.translate(-w / 2, -h / 2);

        const invZoom = 1 / s.camera.zoom;
        const vx1 = (0 - s.camera.panX - w / 2) * invZoom + w / 2;
        const vy1 = (0 - s.camera.panY - h / 2) * invZoom + h / 2;
        const vx2 = (w - s.camera.panX - w / 2) * invZoom + w / 2;
        const vy2 = (h - s.camera.panY - h / 2) * invZoom + h / 2;
        const margin = 60;

        const q = searchRef.current.toLowerCase().trim();

        const drawEdges = s.edges;
        const drawNodes = s.nodes;

        for (const e of drawEdges) {
          const src = nodeMap.get(e.source);
          const tgt = nodeMap.get(e.target);
          if (!src || !tgt) continue;

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
          drawRope(ctx, e, src, tgt, s.time, a, active, s.camera.zoom);
        }

        for (const n of drawNodes) {
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
          drawKnot(ctx, n, s.time, hov, sel, a, s.camera.zoom);
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
        const s = sessionRef.current;
        const isMobile = w < 768;
        const quoteSize = isMobile ? Math.max(16, TEXT.introQuote.size * 0.7) : TEXT.introQuote.size;
        const subSize = isMobile ? Math.max(11, TEXT.introSub.size * 0.8) : TEXT.introSub.size;
        const ctaSize = isMobile ? Math.max(10, TEXT.introCta.size * 0.85) : TEXT.introCta.size;

        if (s.intro === "showing") {
          ctx.fillStyle = composeRgba(COLOR.introBg);
          ctx.fillRect(0, 0, w, h);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = composeRgba(COLOR.introText);
          ctx.font = composeFont(TEXT.introQuote, quoteSize);

          if (isMobile) {
            ctx.fillText('"Trama es el mapa', w / 2, h / 2 - 40);
            ctx.fillText('de lo que tu universidad', w / 2, h / 2 - 16);
            ctx.fillText('ya sabe, pero nunca te dijo."', w / 2, h / 2 + 8);
          } else {
            ctx.fillText(
              '"Trama es el mapa de lo que tu universidad ya sabe,',
              w / 2,
              h / 2 - 24,
            );
            ctx.fillText('pero nunca te dijo."', w / 2, h / 2 + 10);
          }

          ctx.font = composeFont(TEXT.introSub, subSize);
          ctx.fillStyle = composeRgba(COLOR.introSub);

          if (isMobile) {
            ctx.fillText(
              "Explora. Cada nodo es una puerta.",
              w / 2,
              h / 2 + 44,
            );
            ctx.fillText(
              "Cada arista, una conversación pendiente.",
              w / 2,
              h / 2 + 64,
            );
          } else {
            ctx.fillText(
              "Explora. Cada nodo es una puerta. Cada arista, una conversación pendiente.",
              w / 2,
              h / 2 + 50,
            );
          }

          ctx.font = composeFont(TEXT.introCta, ctaSize);
          ctx.fillStyle = composeRgba(COLOR.introCta);
          ctx.fillText("[ toca para comenzar ]", w / 2, h / 2 + (isMobile ? 100 : 84));
        } else if (s.intro === "dissolving") {
          s.dissolve += 0.022;
          if (s.dissolve >= 1) {
            s.intro = "done";
            return;
          }
          const TILE = 7;
          ctx.fillStyle = composeRgba(COLOR.dissolveBg);
          for (let tx = 0; tx < w; tx += TILE) {
            for (let ty = 0; ty < h; ty += TILE) {
              const bx = Math.floor(tx / TILE) % 4;
              const by = Math.floor(ty / TILE) % 4;
              if (s.dissolve < BAYER[by][bx]) ctx.fillRect(tx, ty, TILE, TILE);
            }
          }
          const ta = Math.max(0, 1 - s.dissolve * 5);
          if (ta > 0) {
            ctx.fillStyle = composeRgba(COLOR.introText, ta);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = composeFont(TEXT.introQuote, quoteSize);

            if (isMobile) {
              ctx.fillText('"Trama es el mapa', w / 2, h / 2 - 40);
              ctx.fillText('de lo que tu universidad', w / 2, h / 2 - 16);
              ctx.fillText('ya sabe, pero nunca te dijo."', w / 2, h / 2 + 8);
            } else {
              ctx.fillText(
                '"Trama es el mapa de lo que tu universidad ya sabe,',
                w / 2,
                h / 2 - 24,
              );
              ctx.fillText('pero nunca te dijo."', w / 2, h / 2 + 10);
            }
          }
        }
      }
    }, containerRef.current!);

    return () => {
      const sim = sessionRef.current.simulation as d3.Simulation<TNode, undefined>;
      sim?.stop();
      instance.remove();
    };
  }, [containerRef, sessionRef, searchRef, dataVersion]);
}
