import { useEffect, useRef, useState, useCallback } from "react";
import p5 from "p5";
import * as d3 from "d3-force";
import type { TNode } from "../types/graph";
import { TRAMA_GRAPH, processJSONLD } from "../data/graph";
import { BG, NODE_VISUALS, DEFAULT_VISUAL, BAYER } from "../config/visuals";
import { initLayout } from "../lib/layout";
import { drawNode, drawEdge } from "../lib/render";
import { InfoPanel } from "./InfoPanel";
import { SearchBar } from "./SearchBar";
import { EdgeLegend } from "./EdgeLegend";

export function TramaGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panelNode, setPanelNode] = useState<TNode | null>(null);
  const [searchVal, setSearchVal] = useState("");
  const searchRef = useRef("");
  const setPanelRef = useRef(setPanelNode);

  useEffect(() => {
    setPanelRef.current = setPanelNode;
  }, []);
  useEffect(() => {
    searchRef.current = searchVal;
  }, [searchVal]);

  const graphData = useRef(processJSONLD(TRAMA_GRAPH)).current;

  const getConns = useCallback(
    (id: string) =>
      graphData.edges
        .filter((e) => e.source === id || e.target === id)
        .map((e) => ({
          predicate: e.predicate,
          id: e.source === id ? e.target : e.source,
          label:
            graphData.nodes.find(
              (n) => n.id === (e.source === id ? e.target : e.source),
            )?.label ?? "",
        })),
    [graphData],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const { nodes, edges } = graphData;

    const instance = new p5((p: p5) => {
      let time = 0;
      let panX = 0,
        panY = 0,
        zoom = 1;
      let selId: string | null = null;
      let hovId: string | null = null;
      let intro: "showing" | "dissolving" | "done" = "showing";
      let introSec = 0;
      let dissolve = 0;
      let dragging = false;
      let dStartX = 0,
        dStartY = 0;
      let dragNode: TNode | null = null;
      let simulation: d3.Simulation<TNode, undefined> | null = null;

      p.setup = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cnv = p.createCanvas(w, h);
        cnv.parent(containerRef.current!);
        const canvasEl = containerRef.current!.querySelector("canvas");
        if (canvasEl) (canvasEl as HTMLElement).style.zIndex = "0";
        p.randomSeed(42);
        initLayout(nodes, p.width, p.height);
        const links = edges.map((e) => ({
          source: nodes.find((n) => n.id === e.source)!,
          target: nodes.find((n) => n.id === e.target)!,
        }));
        simulation = d3
          .forceSimulation(nodes)
          .force("link", d3.forceLink(links).distance(120).strength(0.012))
          .force("charge", d3.forceManyBody().strength(-400))
          .force("center", d3.forceCenter(p.width / 2, p.height / 2))
          .force("collide", d3.forceCollide(20))
          .alphaDecay(0.02);
        simulation.on("tick", () => {});
      };

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
      };

      p.draw = () => {
        time += 0.004;
        introSec += (p as any).deltaTime ? (p as any).deltaTime / 1000 : 0.016;

        const ctx = p.drawingContext as CanvasRenderingContext2D;

        // Clear with background color
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, p.width, p.height);

        ctx.save();
        ctx.translate(panX + p.width / 2, panY + p.height / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-p.width / 2, -p.height / 2);

        const q = searchRef.current.toLowerCase().trim();

        // Draw edges
        for (const e of edges) {
          const src = nodes.find((n) => n.id === e.source);
          const tgt = nodes.find((n) => n.id === e.target);
          if (!src || !tgt) continue;
          const active =
            hovId === e.source ||
            hovId === e.target ||
            selId === e.source ||
            selId === e.target;
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
          else if (hovId || selId) a = 0.04;
          if (q && !mSrc && !mTgt) a = 0.025;
          drawEdge(ctx, e, src, tgt, time, a, active);
        }

        // Draw nodes
        for (const n of nodes) {
          const vis = NODE_VISUALS[n.type] ?? DEFAULT_VISUAL;
          const hov = n.id === hovId;
          const sel = n.id === selId;
          const match =
            !q ||
            n.label.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q)) ||
            n.description.toLowerCase().includes(q);
          let a = 0.92;
          if ((hovId || selId) && !hov && !sel) a = 0.22;
          if (q && !match) a = 0.07;
          drawNode(p, ctx, n, vis, time, hov, sel, a);
        }

        ctx.restore();

        // Render intro overlay
        if (intro !== "done") {
          if (intro === "showing" && introSec > 4) intro = "dissolving";
          renderIntro(ctx, p.width, p.height);
        }
      };

      function renderIntro(
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
      ) {
        if (intro === "showing") {
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
        } else if (intro === "dissolving") {
          dissolve += 0.022;
          if (dissolve >= 1) {
            intro = "done";
            return;
          }
          const TILE = 7;
          ctx.fillStyle = "rgba(15,14,11,0.95)";
          for (let tx = 0; tx < w; tx += TILE) {
            for (let ty = 0; ty < h; ty += TILE) {
              const bx = Math.floor(tx / TILE) % 4;
              const by = Math.floor(ty / TILE) % 4;
              if (dissolve < BAYER[by][bx]) ctx.fillRect(tx, ty, TILE, TILE);
            }
          }
          const ta = Math.max(0, 1 - dissolve * 5);
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

      function toGraph(mx: number, my: number): [number, number] {
        return [
          (mx - panX - p.width / 2) / zoom + p.width / 2,
          (my - panY - p.height / 2) / zoom + p.height / 2,
        ];
      }

      function hitTest(mx: number, my: number): TNode | null {
        const [gx, gy] = toGraph(mx, my);
        for (const n of nodes) {
          const dx = gx - n.x,
            dy = gy - n.y;
          if (dx * dx + dy * dy < 16 * 16) return n;
        }
        return null;
      }

      p.mouseMoved = () => {
        if (intro !== "done") return;
        const n = hitTest(p.mouseX, p.mouseY);
        hovId = n ? n.id : null;
        containerRef.current!.style.cursor = n ? "pointer" : "default";
      };

      p.mousePressed = () => {
        if (intro !== "done") {
          intro = "dissolving";
          return;
        }
        const n = hitTest(p.mouseX, p.mouseY);
        if (n) {
          dragNode = n;
          dragging = false;
        } else {
          dragging = false;
          dStartX = p.mouseX;
          dStartY = p.mouseY;
        }
      };

      p.mouseReleased = () => {
        if (intro !== "done") return;
        if (dragNode) {
          simulation?.alphaTarget(0);
          dragNode = null;
        }
        if (!dragging) {
          const n = hitTest(p.mouseX, p.mouseY);
          if (n) {
            if (selId === n.id) {
              selId = null;
              setPanelRef.current(null);
            } else {
              selId = n.id;
              setPanelRef.current(n);
            }
          } else {
            selId = null;
            setPanelRef.current(null);
          }
        }
        dragging = false;
      };

      p.mouseDragged = () => {
        if (intro !== "done") return;
        if (dragNode) {
          dragNode.x += p.movedX / zoom;
          dragNode.y += p.movedY / zoom;
          dragNode.vx = 0;
          dragNode.vy = 0;
          simulation?.alphaTarget(0.3).restart();
        } else {
          if (
            !dragging &&
            Math.hypot(p.mouseX - dStartX, p.mouseY - dStartY) > 5
          ) {
            dragging = true;
          }
          if (dragging) {
            panX += p.movedX;
            panY += p.movedY;
          }
        }
      };

      p.mouseWheel = (e: WheelEvent) => {
        if (intro !== "done") return false as any;
        const delta = -e.deltaY * 0.001;
        zoom = Math.max(0.22, Math.min(3.8, zoom + delta));
        return false as any;
      };
    }, containerRef.current!);

    return () => instance.remove();
  }, [graphData]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0f0e0b",
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      />

      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <InfoPanel
            node={panelNode}
            onClose={() => setPanelNode(null)}
            getConns={getConns}
          />
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <SearchBar
            value={searchVal}
            onChange={setSearchVal}
            offset={panelNode !== null}
          />
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <EdgeLegend />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 20,
          fontFamily: "var(--font-mono)",
          fontSize: 8.5,
          color: "color-mix(in srgb, var(--color-fg) 20%, transparent)",
          letterSpacing: "0.1em",
        }}
      >
        trama · seed:42
      </div>
    </div>
  );
}
