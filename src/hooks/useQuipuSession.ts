import { useRef, useState, useEffect } from 'react'
import type { ExplorationSession } from '../types/graph'
import { fetchQuipuGraph } from '../data/quipus'
import { assignAreaColors } from '../lib/tokens'

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

export function useQuipuSession(quipuId: string) {
  const sessionRef = useRef<ExplorationSession>(createInitialSession(quipuId))
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ nodes: 0, edges: 0 })
  const [dataVersion, setDataVersion] = useState(0)

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

  return { sessionRef, loading, stats, dataVersion }
}
