import { useRef, useState, useCallback, useEffect } from "react";
import type { TNode, TEdge, QuipuSummary } from "../../types/graph";
import { fetchQuipus, fetchQuipuGraph, getDummyQuipuGraph } from "../../data/quipus";
import { useGraphSimulation, type SimulationState } from "./useGraphSimulation";
import { useGraphInteraction } from "./useGraphInteraction";
import { OverlayLayer } from "../overlay/OverlayLayer";
import { InfoPanel } from "../ui/InfoPanel";
import { SearchBar } from "../ui/SearchBar";
import { RopeLegend } from "../ui/EdgeLegend";
import { QuipuSelector } from "../ui/QuipuSelector";

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

  // Lista de quipus disponibles (top-bar). Si falla, deja la lista vacía
  // y el QuipuSelector solo muestra los ghosts de "próximamente".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchQuipus();
        if (!cancelled) setQuipus(data);
      } catch {
        // backend offline -> ghosts only
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
        background: "#0f0e0b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: "italic",
        fontSize: 21,
        color: "#f0ede4",
      }}>
        cargando trama…
      </div>
    );
  }

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
          zIndex: 0,
        }}
      />

      <OverlayLayer>
        <div style={{ pointerEvents: "auto" }}>
          <InfoPanel
            node={panelNode}
            onClose={() => setPanelNode(null)}
            getConns={getConns}
          />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <SearchBar
            value={searchVal}
            onChange={setSearchVal}
            offset={panelNode !== null}
          />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <RopeLegend />
        </div>
        <QuipuSelector
          quipus={quipus}
          activeId={activeQuipuId}
          onSelect={setActiveQuipuId}
        />
      </OverlayLayer>

      {/* Wordmark */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 22,
          zIndex: 20,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic",
          fontSize: 22,
          color: "#f0ede4",
          letterSpacing: "0.04em",
          opacity: 0.9,
          pointerEvents: "none",
        }}
      >
        trama
      </div>

      {/* Stats */}
      <div
        style={{
          position: "absolute",
          top: 18,
          right: 18,
          zIndex: 20,
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: "rgba(240,237,228,0.38)",
          letterSpacing: "0.08em",
          textAlign: "right",
          pointerEvents: "none",
        }}
      >
        {stats.nodes} nudos · {stats.edges} cuerdas
      </div>
    </div>
  );
}
