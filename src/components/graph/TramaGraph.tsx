import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import type { TNode } from "../../types/graph";
import { processJSONLD, TRAMA_GRAPH } from "../../data/graph";
import { useGraphSimulation, type SimulationState } from "./useGraphSimulation";
import { useGraphInteraction } from "./useGraphInteraction";
import { OverlayLayer } from "../overlay/OverlayLayer";
import { InfoPanel } from "../ui/InfoPanel";
import { SearchBar } from "../ui/SearchBar";
import { EdgeLegend } from "../ui/EdgeLegend";

export function TramaGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panelNode, setPanelNode] = useState<TNode | null>(null);
  const [searchVal, setSearchVal] = useState("");
  const searchRef = useRef("");
  useEffect(() => {
    searchRef.current = searchVal;
  }, [searchVal]);

  const graphData = useMemo(() => processJSONLD(TRAMA_GRAPH), []);

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

  const { nodes, edges } = graphData;

  const getConns = useCallback(
    (id: string) =>
      edges
        .filter((e) => e.source === id || e.target === id)
        .map((e) => ({
          predicate: e.predicate,
          id: e.source === id ? e.target : e.source,
          label:
            nodes.find(
              (n) => n.id === (e.source === id ? e.target : e.source),
            )?.label ?? "",
        })),
    [nodes, edges],
  );

  const p5Ref = useGraphSimulation(
    containerRef,
    nodes,
    edges,
    searchRef,
    stateRef,
  );

  useGraphInteraction(
    p5Ref,
    containerRef,
    nodes,
    stateRef,
    setPanelNode,
  );

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
          <EdgeLegend />
        </div>
      </OverlayLayer>

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
        trama &middot; seed:42
      </div>
    </div>
  );
}
