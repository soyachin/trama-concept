import { useEffect } from "react";
import type p5 from "p5";
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
  width: number,
  height: number,
): TNode | null {
  const [gx, gy] = toGraph(mx, my, s, width, height);
  for (const n of nodes) {
    const dx = gx - n.x,
      dy = gy - n.y;
    if (dx * dx + dy * dy < 16 * 16) return n;
  }
  return null;
}

export function useGraphInteraction(
  p5Ref: React.RefObject<p5 | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  nodes: TNode[],
  stateRef: React.MutableRefObject<SimulationState>,
  setPanelNode: (node: TNode | null) => void,
) {
  useEffect(() => {
    const p = p5Ref.current;
    if (!p) return;
    const s = stateRef.current;

    p.mouseMoved = () => {
      if (s.intro !== "done") return;
      const n = hitTest(p.mouseX, p.mouseY, nodes, s, p.width, p.height);
      s.hovId = n ? n.id : null;
      if (containerRef.current)
        containerRef.current.style.cursor = n ? "pointer" : "default";
    };

    p.mousePressed = () => {
      if (s.intro !== "done") {
        s.intro = "dissolving";
        return;
      }
      const n = hitTest(p.mouseX, p.mouseY, nodes, s, p.width, p.height);
      if (n) {
        s.dragNode = n;
        s.dragging = false;
      } else {
        s.dragging = false;
        s.dStartX = p.mouseX;
        s.dStartY = p.mouseY;
      }
    };

    p.mouseReleased = () => {
      if (s.intro !== "done") return;
      if (s.dragNode) {
        s.simulation?.alphaTarget(0);
        s.dragNode = null;
      }
      if (!s.dragging) {
        const n = hitTest(p.mouseX, p.mouseY, nodes, s, p.width, p.height);
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

    p.mouseDragged = () => {
      if (s.intro !== "done") return;
      if (s.dragNode) {
        s.dragNode.x += p.movedX / s.zoom;
        s.dragNode.y += p.movedY / s.zoom;
        s.dragNode.vx = 0;
        s.dragNode.vy = 0;
        s.simulation?.alphaTarget(0.3).restart();
      } else {
        if (
          !s.dragging &&
          Math.hypot(p.mouseX - s.dStartX, p.mouseY - s.dStartY) > 5
        ) {
          s.dragging = true;
        }
        if (s.dragging) {
          s.panX += p.movedX;
          s.panY += p.movedY;
        }
      }
    };

    p.mouseWheel = (e: WheelEvent) => {
      if (s.intro !== "done") return false as never;
      const delta = -e.deltaY * 0.001;
      s.zoom = Math.max(0.22, Math.min(3.8, s.zoom + delta));
      return false as never;
    };

    // Touch events for mobile (pinch zoom + pan)
    let lastTouchDist = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;

    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
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

    const handleTouchMove = (e: TouchEvent) => {
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

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, [p5Ref, containerRef, nodes, stateRef, setPanelNode]);
}
