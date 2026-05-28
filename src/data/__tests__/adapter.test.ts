import { describe, it, expect } from 'vitest'
import { adaptQuipuGraph, SYNTHETIC, ROOT_LABEL, type ApiQuipuGraph } from '../adapter'

const baseFixture: ApiQuipuGraph = {
  id: 'quipu-test',
  label: 'Test Quipu',
  group_by: 'area',
  nodes: [
    {
      id: 'node-1',
      label: 'Node 1',
      type: 'OrganizacionEstudiantil',
      group_key: 'Area A',
      metadata: {},
    },
    {
      id: 'node-2',
      label: 'Node 2',
      type: 'OrganizacionEstudiantil',
      group_key: 'Area A',
      metadata: {},
    },
    {
      id: 'node-3',
      label: 'Node 3',
      type: 'OrganizacionEstudiantil',
      group_key: 'Area B',
      metadata: {},
    },
  ],
  edges: [
    { source: 'node-1', target: 'node-2', predicate: 'alianzaCon' },
  ],
  groups: ['Area A', 'Area B'],
}

describe('adaptQuipuGraph', () => {
  it('produce un QuipuGraph válido con el fixture base', () => {
    const result = adaptQuipuGraph(baseFixture)
    expect(result.id).toBe('quipu-test')
    expect(result.label).toBe('Test Quipu')
    expect(result.groups).toHaveLength(2)
    expect(result.groups[0]!.key).toBe('Area A')
    expect(result.groups[1]!.key).toBe('Area B')
  })

  it('genera el nodo raíz sintético correctamente', () => {
    const result = adaptQuipuGraph(baseFixture)
    const root = result.nodes.find(n => n.id === SYNTHETIC.ROOT_ID)
    expect(root).toBeDefined()
    expect(root!.type).toBe('Root')
    expect(root!.label).toBe(ROOT_LABEL)
    expect(root!.synthetic).toBe(true)
  })

  it('genera un AreaHeader por cada grupo', () => {
    const result = adaptQuipuGraph(baseFixture)
    const areaHeaders = result.nodes.filter(n => n.type === 'AreaHeader')
    expect(areaHeaders).toHaveLength(2)
    const areaIds = areaHeaders.map(h => h.id)
    expect(areaIds).toContain(`${SYNTHETIC.AREA_PREFIX}Area A`)
    expect(areaIds).toContain(`${SYNTHETIC.AREA_PREFIX}Area B`)
  })

  it('genera edges sintéticas root→area correctamente', () => {
    const result = adaptQuipuGraph(baseFixture)
    const rootEdges = result.edges.filter(e => e.predicate === 'quipu')
    expect(rootEdges).toHaveLength(2)
    for (const edge of rootEdges) {
      expect(edge.source).toBe(SYNTHETIC.ROOT_ID)
      expect(edge.target.startsWith(SYNTHETIC.AREA_PREFIX)).toBe(true)
      expect(edge.synthetic).toBe(true)
    }
  })

  it('genera edges sintéticas area→nodo correctamente', () => {
    const result = adaptQuipuGraph(baseFixture)
    const areaEdges = result.edges.filter(e => e.predicate === 'perteneceArea')
    expect(areaEdges).toHaveLength(3)
    for (const edge of areaEdges) {
      expect(edge.source.startsWith(SYNTHETIC.AREA_PREFIX)).toBe(true)
      expect(edge.synthetic).toBe(true)
    }
    const targets = areaEdges.map(e => e.target)
    expect(targets).toContain('node-1')
    expect(targets).toContain('node-2')
    expect(targets).toContain('node-3')
  })

  it('preserva las edges de datos originales', () => {
    const result = adaptQuipuGraph(baseFixture)
    const dataEdges = result.edges.filter(
      e => e.predicate !== 'quipu' && e.predicate !== 'perteneceArea',
    )
    expect(dataEdges).toHaveLength(1)
    expect(dataEdges[0]!.source).toBe('node-1')
    expect(dataEdges[0]!.target).toBe('node-2')
    expect(dataEdges[0]!.predicate).toBe('alianzaCon')
  })

  it('un fixture con group_key: null no genera AreaEdge para ese nodo', () => {
    const fixtureWithNull: ApiQuipuGraph = {
      id: 'quipu-null',
      label: 'Test Null',
      group_by: 'area',
      nodes: [
        {
          id: 'node-orphan',
          label: 'Orphan Node',
          type: 'OrganizacionEstudiantil',
          group_key: null,
          metadata: {},
        },
        {
          id: 'node-grouped',
          label: 'Grouped Node',
          type: 'OrganizacionEstudiantil',
          group_key: 'My Group',
          metadata: {},
        },
      ],
      edges: [],
      groups: ['My Group'],
    }
    const result = adaptQuipuGraph(fixtureWithNull)
    const areaEdges = result.edges.filter(e => e.predicate === 'perteneceArea')
    expect(areaEdges).toHaveLength(1)
    expect(areaEdges[0]!.target).toBe('node-grouped')
  })

  it('el conteo total de nodos y edges es correcto', () => {
    const result = adaptQuipuGraph(baseFixture)
    // 1 root + 2 area headers + 3 data nodes = 6
    expect(result.nodes).toHaveLength(6)
    // 2 root→area + 3 area→node + 1 data edge = 6
    expect(result.edges).toHaveLength(6)
  })
})
