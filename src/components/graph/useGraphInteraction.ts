import { useEffect, useRef } from "react";
import type { TNode } from "../../types/graph";
import type { SimulationState } from "./useGraphSimulation";

function toGraph(
  mx: number,
  my: number,
  s: SimulationState,
  width: number,
  height: number,
): [number, number] {
  return [
    (mx - s.panX - width / 2) / s.zoom + width / 2,
    (my - s.panY - height / 2) / s.zoom + height / 2,
  ];
}

function hitTest(
  mx: number,
  my: number,
  nodes: TNode[],
  s: SimulationState,
  canvasW: number,
  canvasH: number,
): TNode | null {
  const [gx, gy] = toGraph(mx, my, s, canvasW, canvasH);
  for (const n of nodes) {
    // La raíz "comunidad UTEC" es solo tipografía decorativa, no un nodo
    // interactivo. Saltarla evita capturar clicks cerca del centro.
    if (n.type === 'Root') continue;
    const dx = gx - n.x,
      dy = gy - n.y;
    if (dx * dx + dy * dy < 16 * 16) return n;
  }
  return null;
}

export function useGraphInteraction(
  containerRef: React.RefObject<HTMLDivElement | null>,
  nodes: TNode[],
  stateRef: React.MutableRefObject<SimulationState>,
  setPanelNode: (node: TNode | null) => void,
) {
  const prevMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const s = stateRef.current;

    const getCanvas = () => el.querySelector("canvas");

    const canvasCoords = (e: MouseEvent): [number, number] => {
      const cv = getCanvas();
      if (!cv) return [e.clientX, e.clientY];
      const rect = cv.getBoundingClientRect();
      return [
        ((e.clientX - rect.left) / rect.width) * cv.clientWidth,
        ((e.clientY - rect.top) / rect.height) * cv.clientHeight,
      ];
    };

    const onMouseMove = (e: MouseEvent) => {
      if (s.intro !== "done") return;
      const [mx, my] = canvasCoords(e);
      prevMouseRef.current = { x: mx, y: my };
      const cv = getCanvas();
      if (!cv) return;
      const n = hitTest(mx, my, nodes, s, cv.clientWidth, cv.clientHeight);
      s.hovId = n ? n.id : null;
      el.style.cursor = n ? "pointer" : "default";
    };

    const onMouseDown = (e: MouseEvent) => {
      if (s.intro !== "done") {
        s.intro = "dissolving";
        return;
      }
      const [mx, my] = canvasCoords(e);
      prevMouseRef.current = { x: mx, y: my };
      const cv = getCanvas();
      if (!cv) return;
      const n = hitTest(mx, my, nodes, s, cv.clientWidth, cv.clientHeight);
      // Los nudos cabecera de área están pinneados al layout y no
      // deben arrastrarse — la raíz ya quedó filtrada por hitTest.
      if (n && !n.synthetic) {
        s.dragNode = n;
        s.dragging = false;
      } else {
        s.dragging = false;
        s.dStartX = mx;
        s.dStartY = my;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (s.intro !== "done") return;
      const [mx, my] = canvasCoords(e);
      if (s.dragNode) {
        s.simulation?.alphaTarget(0);
        s.dragNode = null;
      }
      if (!s.dragging) {
        const cv = getCanvas();
        if (!cv) return;
        const n = hitTest(mx, my, nodes, s, cv.clientWidth, cv.clientHeight);
        if (n) {
          if (s.selId === n.id) {
            s.selId = null;
            setPanelNode(null);
          } else {
            s.selId = n.id;
            setPanelNode(n);
          }
        } else {
          s.selId = null;
          setPanelNode(null);
        }
      }
      s.dragging = false;
    };

    const onDrag = (e: MouseEvent) => {
      if (s.intro !== "done") return;
      if (!(e.buttons & 1)) return;
      const [mx, my] = canvasCoords(e);
      const movedX = mx - prevMouseRef.current.x;
      const movedY = my - prevMouseRef.current.y;
      prevMouseRef.current = { x: mx, y: my };

      if (s.dragNode) {
        s.dragNode.x += movedX / s.zoom;
        s.dragNode.y += movedY / s.zoom;
        s.dragNode.vx = 0;
        s.dragNode.vy = 0;
        s.simulation?.alphaTarget(0.3).restart();
      } else {
        const dx = mx - s.dStartX;
        const dy = my - s.dStartY;
        if (!s.dragging && Math.hypot(dx, dy) > 5) {
          s.dragging = true;
        }
        if (s.dragging) {
          s.panX += movedX;
          s.panY += movedY;
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (s.intro !== "done") return;
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      s.zoom = Math.max(0.22, Math.min(3.8, s.zoom + delta));
    };

    let lastTouchDist = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (s.intro !== "done") {
        s.intro = "dissolving";
        return;
      }
      if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        lastTouchDist = Math.hypot(dx, dy);
        lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (s.intro !== "done") return;
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const dist = Math.hypot(dx, dy);
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        if (lastTouchDist > 0) {
          const scale = dist / lastTouchDist;
          s.zoom = Math.max(0.22, Math.min(3.8, s.zoom * scale));
        }

        s.panX += cx - lastTouchX;
        s.panY += cy - lastTouchY;

        lastTouchDist = dist;
        lastTouchX = cx;
        lastTouchY = cy;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (s.intro !== "done") return;
      if (e.changedTouches.length === 1 && e.touches.length === 0) {
        const t = e.changedTouches[0];
        const rect = el.getBoundingClientRect();
        const mx = ((t.clientX - rect.left) / rect.width) * el.clientWidth;
        const my = ((t.clientY - rect.top) / rect.height) * el.clientHeight;
        const cv = getCanvas();
        const n = hitTest(mx, my, nodes, s, cv?.clientWidth ?? el.clientWidth, cv?.clientHeight ?? el.clientHeight);
        if (n) {
          if (s.selId === n.id) {
            s.selId = null;
            setPanelNode(null);
          } else {
            s.selId = n.id;
            setPanelNode(n);
          }
        } else {
          s.selId = null;
          setPanelNode(null);
        }
      }
    };

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mousemove", onDrag);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onDrag);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [containerRef, nodes, stateRef, setPanelNode]);
}
