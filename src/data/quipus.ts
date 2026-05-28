import type { QuipuSummary } from '../types/graph'
import type { ApiQuipuGraph, ApiResourceDetail } from './adapter'
import { adaptQuipuGraph } from './adapter'
import rawFixture from './fixtures/quipu-social.json'

export { type QuipuGraph } from '../types/graph'
export { SYNTHETIC, ROOT_LABEL } from './adapter'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

export async function fetchQuipus(): Promise<QuipuSummary[]> {
  const res = await fetch(`${API_BASE}/quipus`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchQuipuGraph(quipuId: string) {
  try {
    const res = await fetch(`${API_BASE}/quipus/${quipuId}/graph`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const raw = await res.json()
    return adaptQuipuGraph(raw)
  } catch {
    return adaptQuipuGraph(rawFixture as ApiQuipuGraph)
  }
}

export async function fetchNodeDetail(slug: string, endpoint: string): Promise<ApiResourceDetail> {
  const res = await fetch(`${API_BASE}/${endpoint}/${slug}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
