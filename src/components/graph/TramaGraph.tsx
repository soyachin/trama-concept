import { useRef, useState, useCallback, useEffect } from "react";
import type { TNode, TEdge, QuipuSummary } from "../../types/graph";
import { UI_COLOR, toReactStyle } from "../../config/typography";
import { assignAreaColors } from "../../lib/tokens";
import { fetchQuipus, fetchQuipuGraph, getDummyQuipuGraph } from "../../data/quipus";
import { useGraphSimulation, type SimulationState } from "./useGraphSimulation";
import { useGraphInteraction } from "./useGraphInteraction";
import { QuipuSelector } from "../ui/QuipuSelector";
import { DesktopLayout } from "../desktop/DesktopLayout";
import { DesktopSearch } from "../desktop/DesktopSearch";
import { DesktopLegend } from "../desktop/DesktopLegend";
import { DesktopInfoPanel } from "../desktop/DesktopInfoPanel";
import { MobileLayout } from "../mobile/MobileLayout";
import { MobileSearch } from "../mobile/MobileSearch";
import { MobileLegend } from "../mobile/MobileLegend";
import { MobileInfoPanel } from "../mobile/MobileInfoPanel";
import "../desktop/DesktopLayout.css";
import "../mobile/MobileLayout.css";

const DEFAULT_QUIPU_ID = "social";

export function TramaGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panelNode, setPanelNode] = useState<TNode | null>(null);
  const [searchVal, setSearchVal] = useState("");
  const searchRef = useRef("");
  useEffect(() => {
    searchRef.current = searchVal;
  }, [searchVal]);

  const [quipus, setQuipus] = useState<QuipuSummary[]>([]);
  const [activeQuipuId, setActiveQuipuId] = useState<string>(DEFAULT_QUIPU_ID);
  const [nodes, setNodes] = useState<TNode[]>([]);
  const [edges, setEdges] = useState<TEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  
  // Platform detection - single source of truth
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  
  useEffect(() => {
    const m = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    m.addEventListener('change', handler);
    return () => m.removeEventListener('change', handler);
  }, []);

  // Lista de quipus disponibles (top-bar). Si falla, deja la lista vacía.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchQuipus();
        if (!cancelled) setQuipus(data);
      } catch {
        // backend offline -> selector vacío
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchQuipuGraph(activeQuipuId);
        if (cancelled) return;
        assignAreaColors(data.groups);
        setNodes(data.nodes);
        setEdges(data.edges);
        setStats({
          nodes: data.nodes.filter(n => !n.synthetic).length,
          edges: data.edges.filter(e => !e.synthetic).length,
        });
      } catch {
        console.warn("API unavailable, using fallback quipu data");
        const data = getDummyQuipuGraph();
        if (cancelled) return;
        assignAreaColors(data.groups);
        setNodes(data.nodes);
        setEdges(data.edges);
        setStats({
          nodes: data.nodes.filter(n => !n.synthetic).length,
          edges: data.edges.filter(e => !e.synthetic).length,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeQuipuId]);

  const stateRef = useRef<SimulationState>({
    time: 0,
    panX: 0,
    panY: 0,
    zoom: 1,
    selId: null,
    hovId: null,
    intro: "showing",
    introSec: 0,
    dissolve: 0,
    dragging: false,
    dStartX: 0,
    dStartY: 0,
    dragNode: null,
    simulation: null,
  });

  // Build adjacency + edge lookup once. Excluye edges sintéticas (raíz →
  // área → nodo) del panel de conexiones — son estructurales del quipu,
  // no relaciones semánticas del individuo.
  const edgeIndex = useRef(new Map<string, { predicate: string; id: string; label: string }[]>());
  useEffect(() => {
    const idx = new Map<string, { predicate: string; id: string; label: string }[]>();
    const nodeMap = new Map<string, TNode>();
    for (const n of nodes) nodeMap.set(n.id, n);
    for (const e of edges) {
      if (e.synthetic) continue;
      const srcLabel = nodeMap.get(e.source)?.label ?? '';
      const tgtLabel = nodeMap.get(e.target)?.label ?? '';
      if (!idx.has(e.source)) idx.set(e.source, []);
      if (!idx.has(e.target)) idx.set(e.target, []);
      idx.get(e.source)!.push({ predicate: e.predicate, id: e.target, label: tgtLabel });
      idx.get(e.target)!.push({ predicate: e.predicate, id: e.source, label: srcLabel });
    }
    edgeIndex.current = idx;
  }, [nodes, edges]);

  const getConns = useCallback(
    (id: string) => edgeIndex.current.get(id) ?? [],
    [],
  );

  useGraphSimulation(containerRef, nodes, edges, searchRef, stateRef);
  useGraphInteraction(containerRef, nodes, stateRef, setPanelNode);

  if (loading) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: UI_COLOR.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...toReactStyle({ family: () => "'EB Garamond', Georgia, serif", size: 21, weight: 400, style: 'italic' }),
        color: UI_COLOR.fg,
      }}>
        cargando trama…
      </div>
    );
  }

  const selector = (
    <QuipuSelector
      quipus={quipus}
      activeId={activeQuipuId}
      onSelect={setActiveQuipuId}
    />
  );

  const infoPanel = (
    <DesktopInfoPanel
      node={panelNode}
      onClose={() => setPanelNode(null)}
      getConns={getConns}
    />
  );

  const mobileInfoPanel = (
    <MobileInfoPanel
      node={panelNode}
      onClose={() => setPanelNode(null)}
      getConns={getConns}
    />
  );

  return (
    <div className="trama-root">
      <div
        ref={containerRef}
        className="trama-canvas-layer"
      />

      {isMobile ? (
        <MobileLayout
          wordmark={<div className="mobile-layout__wordmark">trama</div>}
          search={<MobileSearch value={searchVal} onChange={setSearchVal} />}
          selector={selector}
          infoPanel={mobileInfoPanel}
          legend={<MobileLegend />}
        />
      ) : (
        <DesktopLayout
          wordmark={<div className="desktop-layout__wordmark">trama</div>}
          selector={selector}
          stats={
            panelNode === null ? (
              <div className="desktop-layout__stats">
                {stats.nodes} nudos · {stats.edges} cuerdas
              </div>
            ) : null
          }
          infoPanel={infoPanel}
          legend={<DesktopLegend />}
          search={<DesktopSearch value={searchVal} onChange={setSearchVal} />}
        />
      )}
    </div>
  );
}
