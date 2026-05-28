import { useEffect, useRef } from "react";
import type { TNode, ExplorationSession } from "../../types/graph";

const IDLE_ALPHA = 0.008;
const DRAG_ALPHA = 0.35;
const MIN_ZOOM = 0.22;
const MAX_ZOOM = 3.8;
const DRAG_THRESHOLD = 5;
const TOUCH_TAP_THRESHOLD = 25;
const FLY_TO_DURATION = 400;
const FLY_TO_ZOOM = 1.4;

function toGraph(
  mx: number,
  my: number,
  s: ExplorationSession,
  width: number,
  height: number,
): [number, number] {
  return [
    (mx - s.camera.panX - width / 2) / s.camera.zoom + width / 2,
    (my - s.camera.panY - height / 2) / s.camera.zoom + height / 2,
  ];
}

function hitTest(
  mx: number,
  my: number,
  nodes: TNode[],
  s: ExplorationSession,
  canvasW: number,
  canvasH: number,
): TNode | null {
  const [gx, gy] = toGraph(mx, my, s, canvasW, canvasH);
  for (const n of nodes) {
    const dx = gx - n.x,
      dy = gy - n.y;
    if (dx * dx + dy * dy < 18 * 18) return n;
  }
  return null;
}

function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

function flyTo(
  s: ExplorationSession,
  targetNode: TNode,
  canvasW: number,
  canvasH: number,
  isMobile = false,
) {
  const startPanX = s.camera.panX;
  const startPanY = s.camera.panY;
  const startZoom = s.camera.zoom;

  const visibleCenterY = isMobile ? canvasH * 0.3 : canvasH / 2;

  const endPanX = -(targetNode.x - canvasW / 2) * FLY_TO_ZOOM;
  const endPanY = -(targetNode.y - visibleCenterY) * FLY_TO_ZOOM;
  const endZoom = FLY_TO_ZOOM;

  const startTime = performance.now();

  function step() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(1, elapsed / FLY_TO_DURATION);
    const ease = 1 - (1 - t) * (1 - t);

    s.camera.panX = startPanX + (endPanX - startPanX) * ease;
    s.camera.panY = startPanY + (endPanY - startPanY) * ease;
    s.camera.zoom = startZoom + (endZoom - startZoom) * ease;

    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function useGraphInteraction(
  containerRef: React.RefObject<HTMLDivElement | null>,
  sessionRef: React.MutableRefObject<ExplorationSession>,
  setPanelNode: (node: TNode | null) => void,
  dataVersion: number,
) {
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const nodeDragActiveRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

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

    const touchCoords = (t: Touch): [number, number] => {
      const cv = getCanvas();
      if (!cv) return [t.clientX, t.clientY];
      const rect = cv.getBoundingClientRect();
      return [
        ((t.clientX - rect.left) / rect.width) * cv.clientWidth,
        ((t.clientY - rect.top) / rect.height) * cv.clientHeight,
      ];
    };

    const onMouseMove = (e: MouseEvent) => {
      const s = sessionRef.current;
      if (s.intro !== "done") return;
      if (s.dragNode || s.dragging) return;
      const [mx, my] = canvasCoords(e);
      const cv = getCanvas();
      if (!cv) return;
      const n = hitTest(mx, my, s.nodes, s, cv.clientWidth, cv.clientHeight);
      s.hovId = n ? n.id : null;
      el.style.cursor = n ? "pointer" : "grab";
    };

    const onMouseDown = (e: MouseEvent) => {
      const s = sessionRef.current;
      if (s.intro !== "done") {
        s.intro = "dissolving";
        return;
      }
      const [mx, my] = canvasCoords(e);
      prevMouseRef.current = { x: mx, y: my };
      const cv = getCanvas();
      if (!cv) return;
      const n = hitTest(mx, my, s.nodes, s, cv.clientWidth, cv.clientHeight);
      if (n) {
        s.dragNode = n;
        n.fx = n.x;
        n.fy = n.y;
        s.dStartX = mx;
        s.dStartY = my;
        nodeDragActiveRef.current = false;
        const sim = s.simulation as import("d3-force").Simulation<TNode, undefined>;
        sim?.alphaTarget(DRAG_ALPHA).restart();
      } else {
        s.dragging = false;
        s.dStartX = mx;
        s.dStartY = my;
        el.style.cursor = "grabbing";
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      const s = sessionRef.current;
      if (s.intro !== "done") return;
      const [mx, my] = canvasCoords(e);

      if (s.dragNode) {
        s.dragNode.fx = null;
        s.dragNode.fy = null;
        const sim = s.simulation as import("d3-force").Simulation<TNode, undefined>;
        sim?.alpha(0.3).alphaTarget(IDLE_ALPHA).restart();
        const wasDragged = nodeDragActiveRef.current;
        const releasedNode = s.dragNode;
        s.dragNode = null;
        nodeDragActiveRef.current = false;

        if (!wasDragged) {
          if (s.selId === releasedNode.id) {
            s.selId = null;
            setPanelNode(null);
          } else {
            s.selId = releasedNode.id;
            setPanelNode(releasedNode);
            const cv = getCanvas();
            if (cv) flyTo(s, releasedNode, cv.clientWidth, cv.clientHeight);
          }
        }
      } else {
        if (!s.dragging) {
          const cv = getCanvas();
          if (!cv) return;
          const n = hitTest(mx, my, s.nodes, s, cv.clientWidth, cv.clientHeight);
          if (n) {
            if (s.selId === n.id) {
              s.selId = null;
              setPanelNode(null);
            } else {
              s.selId = n.id;
              setPanelNode(n);
              flyTo(s, n, cv.clientWidth, cv.clientHeight);
            }
          } else {
            s.selId = null;
            setPanelNode(null);
          }
        }
        s.dragging = false;
        el.style.cursor = "grab";
      }
    };

    const onDrag = (e: MouseEvent) => {
      const s = sessionRef.current;
      if (s.intro !== "done") return;
      if (!(e.buttons & 1)) return;
      const [mx, my] = canvasCoords(e);
      const movedX = mx - prevMouseRef.current.x;
      const movedY = my - prevMouseRef.current.y;
      prevMouseRef.current = { x: mx, y: my };

      if (s.dragNode) {
        if (!nodeDragActiveRef.current) {
          const dx = mx - s.dStartX;
          const dy = my - s.dStartY;
          if (Math.hypot(dx || movedX, dy || movedY) > DRAG_THRESHOLD) {
            nodeDragActiveRef.current = true;
          }
        }
        if (nodeDragActiveRef.current) {
          s.dragNode.fx! += movedX / s.camera.zoom;
          s.dragNode.fy! += movedY / s.camera.zoom;
          s.dragNode.x = s.dragNode.fx!;
          s.dragNode.y = s.dragNode.fy!;
          el.style.cursor = "grabbing";
        }
      } else {
        const dx = mx - s.dStartX;
        const dy = my - s.dStartY;
        if (!s.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          s.dragging = true;
        }
        if (s.dragging) {
          s.camera.panX += movedX;
          s.camera.panY += movedY;
          el.style.cursor = "grabbing";
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      const s = sessionRef.current;
      if (s.intro !== "done") return;
      e.preventDefault();
      const [mx, my] = canvasCoords(e);
      const cv = getCanvas();
      if (!cv) return;

      const oldZoom = s.camera.zoom;
      const delta = -e.deltaY * 0.001;
      s.camera.zoom = clampZoom(s.camera.zoom + delta);
      const scale = s.camera.zoom / oldZoom;

      s.camera.panX = mx - scale * (mx - s.camera.panX);
      s.camera.panY = my - scale * (my - s.camera.panY);
    };

    const onDblClick = (e: MouseEvent) => {
      const s = sessionRef.current;
      if (s.intro !== "done") return;
      e.preventDefault();
      const [mx, my] = canvasCoords(e);
      const cv = getCanvas();
      if (!cv) return;
      const n = hitTest(mx, my, s.nodes, s, cv.clientWidth, cv.clientHeight);
      if (n) {
        s.selId = n.id;
        setPanelNode(n);
        flyTo(s, n, cv.clientWidth, cv.clientHeight);
      }
    };

    // ── Touch state ───────────────────────────────────────────
    let lastTouchDist = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let touchDragNode: TNode | null = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchIsPan = false;
    let touchMoved = false;

    const onTouchStart = (e: TouchEvent) => {
      const s = sessionRef.current;
      if (s.intro !== "done") {
        s.intro = "dissolving";
        return;
      }
      if (e.touches.length === 2) {
        touchDragNode = null;
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        lastTouchDist = Math.hypot(dx, dy);
        lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      } else if (e.touches.length === 1) {
        const [mx, my] = touchCoords(e.touches[0]);
        touchStartX = mx;
        touchStartY = my;
        touchMoved = false;
        const cv = getCanvas();
        const n = cv
          ? hitTest(mx, my, s.nodes, s, cv.clientWidth, cv.clientHeight)
          : null;
        if (n) {
          touchDragNode = n;
          n.fx = n.x;
          n.fy = n.y;
          touchIsPan = false;
          const sim = s.simulation as import("d3-force").Simulation<TNode, undefined>;
          sim?.alphaTarget(DRAG_ALPHA).restart();
          e.preventDefault();
        } else {
          touchDragNode = null;
          touchIsPan = true;
          lastTouchX = e.touches[0].clientX;
          lastTouchY = e.touches[0].clientY;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const s = sessionRef.current;
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
          s.camera.zoom = clampZoom(s.camera.zoom * scale);
        }

        s.camera.panX += cx - lastTouchX;
        s.camera.panY += cy - lastTouchY;

        lastTouchDist = dist;
        lastTouchX = cx;
        lastTouchY = cy;
      } else if (e.touches.length === 1) {
        const [mx, my] = touchCoords(e.touches[0]);
        const deltaX = e.touches[0].clientX - lastTouchX;
        const deltaY = e.touches[0].clientY - lastTouchY;

        const totalDx = mx - touchStartX;
        const totalDy = my - touchStartY;
        const totalDist = Math.hypot(totalDx, totalDy);

        if (!touchMoved && totalDist > TOUCH_TAP_THRESHOLD) {
          touchMoved = true;
        }

        if (touchMoved) {
          if (touchDragNode) {
            e.preventDefault();
            touchDragNode.fx! += deltaX / s.camera.zoom;
            touchDragNode.fy! += deltaY / s.camera.zoom;
            touchDragNode.x = touchDragNode.fx!;
            touchDragNode.y = touchDragNode.fy!;
          } else if (touchIsPan) {
            e.preventDefault();
            s.camera.panX += deltaX;
            s.camera.panY += deltaY;
          }
        }

        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const s = sessionRef.current;
      if (s.intro !== "done") return;

      let totalDist = 0;
      if (e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        const [mx, my] = touchCoords(t);
        totalDist = Math.hypot(mx - touchStartX, my - touchStartY);
      }

      const isTap = !touchMoved || totalDist < TOUCH_TAP_THRESHOLD;

      if (touchDragNode) {
        touchDragNode.fx = null;
        touchDragNode.fy = null;
        const sim = s.simulation as import("d3-force").Simulation<TNode, undefined>;
        sim?.alpha(0.3).alphaTarget(IDLE_ALPHA).restart();
      }

      if (e.changedTouches.length === 1 && e.touches.length === 0 && isTap) {
        const t = e.changedTouches[0];
        const [mx, my] = touchCoords(t);
        const cv = getCanvas();
        const n = cv
          ? hitTest(mx, my, s.nodes, s, cv.clientWidth, cv.clientHeight)
          : null;
        if (n) {
          if (s.selId === n.id) {
            s.selId = null;
            setPanelNode(null);
          } else {
            s.selId = n.id;
            setPanelNode(n);
            if (cv) flyTo(s, n, cv.clientWidth, cv.clientHeight, true);
          }
        } else {
          s.selId = null;
          setPanelNode(null);
        }
      }

      touchDragNode = null;
      touchIsPan = false;
      touchMoved = false;
    };

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mousemove", onDrag);
    el.addEventListener("dblclick", onDblClick);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onDrag);
      el.removeEventListener("dblclick", onDblClick);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [containerRef, sessionRef, setPanelNode, dataVersion]);
}
