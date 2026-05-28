import { useRef, useState, useEffect } from 'react'
import type { TNode, ExplorationSession } from '../types/graph'
import { fetchQuipuGraph, fetchNodeDetail } from '../data/quipus'
import { assignAreaColors } from '../lib/tokens'
import { TYPE_TO_ENDPOINT, enrichNode } from '../data/adapter'

function createInitialSession(quipuId: string): ExplorationSession {
  return {
    quipuId,
    nodes: [],
    edges: [],
    camera: { panX: 0, panY: 0, zoom: 1 },
    selId: null,
    hovId: null,
    dragging: false,
    dragNode: null,
    dStartX: 0,
    dStartY: 0,
    time: 0,
    intro: 'showing',
    introSec: 0,
    dissolve: 0,
    simulation: null,
  }
}

export function useQuipuSession(quipuId: string, selectedNodeId: string | null) {
  const sessionRef = useRef<ExplorationSession>(createInitialSession(quipuId))
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ nodes: 0, edges: 0 })
  const [dataVersion, setDataVersion] = useState(0)
  const [enrichedNode, setEnrichedNode] = useState<TNode | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    sessionRef.current = createInitialSession(quipuId)
    setLoading(true)

    ;(async () => {
      const data = await fetchQuipuGraph(quipuId)
      if (cancelled) return
      assignAreaColors(data.groups)
      sessionRef.current.nodes = data.nodes
      sessionRef.current.edges = data.edges
      setStats({
        nodes: data.nodes.filter(n => !n.synthetic).length,
        edges: data.edges.filter(e => !e.synthetic).length,
      })
      setDataVersion(v => v + 1)
      setLoading(false)
    })()

    return () => {
      cancelled = true
      const sim = sessionRef.current.simulation as { stop(): void } | null
      sim?.stop()
      sessionRef.current.simulation = null
    }
  }, [quipuId])

  useEffect(() => {
    let cancelled = false

    if (!selectedNodeId) {
      setEnrichedNode(null)
      return
    }

    const node = sessionRef.current.nodes.find(n => n.id === selectedNodeId)
    if (!node || node.synthetic) return

    const endpoint = TYPE_TO_ENDPOINT[node.type]
    if (!endpoint) return

    ;(async () => {
      setDetailLoading(true)
      try {
        const detail = await fetchNodeDetail(node.id, endpoint)
        if (!cancelled) setEnrichedNode(enrichNode(node, detail))
      } catch {
        if (!cancelled) setEnrichedNode(null)
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [selectedNodeId, dataVersion])

  return { sessionRef, loading, stats, dataVersion, enrichedNode, detailLoading }
}
