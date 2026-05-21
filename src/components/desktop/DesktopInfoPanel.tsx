import { useMemo } from 'react'
import type { TNode, NodeMetaValue, RelatedRef } from '../../types/graph'

const PRED_LABELS: Record<string, string> = {
  alianzaCon: 'alianza con',
  organizadoPor: 'organizado por',
  coorganizadoPor: 'coorganizado por',
  asesoradoPor: 'asesorado por',
  usaContenidoDe: 'usa contenido de',
  dictadoPor: 'dictado por',
  perteneceA: 'pertenece a',
  prerequisitoDe: 'prerequisito de',
  miembroDe: 'miembro de',
  investigaEn: 'investiga en',
  participaEn: 'participa en',
  ubicadoEn: 'ubicado en',
  quipu: 'quipu',
  perteneceArea: 'pertenece a área',
}

const TYPE_LABELS: Record<string, string> = {
  'OrganizacionEstudiantil': 'Organización estudiantil',
  'Club': 'Club (informal)',
  'Actividad': 'Actividad',
  'AreaHeader': 'Área',
  'Curso': 'Curso',
  'Docente': 'Docente',
  'Proyecto': 'Proyecto',
  'Laboratorio': 'Laboratorio',
  'Equipo': 'Equipo',
  'Carrera': 'Carrera',
  'Departamento': 'Departamento',
  'GrupoInvestigacion': 'Grupo de Investigación',
}

const META_RELATION_LABELS: Record<string, string> = {
  perteneceA: 'carreras afines',
  asesoradoPor: 'asesores docentes',
  usaContenidoDe: 'cursos relacionados',
}

const META_LITERAL_LABELS: Record<string, string> = {
  area: 'área',
  contacto: 'contacto',
  instagram: 'instagram',
}

function isRelatedList(v: NodeMetaValue): v is RelatedRef[] {
  return Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && 'slug' in (v[0] as object)
}

interface DesktopInfoPanelProps {
  node: TNode | null
  onClose: () => void
  getConns: (id: string) => { predicate: string; id: string; label: string }[]
}

export function DesktopInfoPanel({ node, onClose, getConns }: DesktopInfoPanelProps) {
  const conns = useMemo(() => (node ? getConns(node.id) : []), [node, getConns])
  const byPred = useMemo(() =>
    conns.reduce<Record<string, typeof conns>>((acc, c) => {
      ;(acc[c.predicate] ??= []).push(c)
      return acc
    }, {}),
    [conns]
  )

  return (
    <div className={`desktop-panel ${node ? 'desktop-panel--open' : ''}`}>
      {node && (<>
        <button
          onClick={onClose}
          className="desktop-panel__close"
          aria-label="Cerrar panel"
        >×</button>

        <div className="desktop-panel__kind">
          {TYPE_LABELS[node.type] ?? node.type}
        </div>

        <div className="desktop-panel__title">
          {node.label}
        </div>

        {node.description && (
          <div className="desktop-panel__body">
            {node.description}
          </div>
        )}

        {hasLiteralMeta(node) && (
          <div className="desktop-panel__divider">
            {Object.entries(META_LITERAL_LABELS).map(([k, label]) => {
              const v = node.metadata?.[k]
              if (typeof v !== 'string' || !v) return null
              return <Row key={k} k={label} v={v} />
            })}
            {node.founded && <Row k="fundado" v={node.founded} />}
            {node.ciclo && <Row k="ciclo" v={node.ciclo} />}
          </div>
        )}

        {hasRelationMeta(node) && (
          <div className="desktop-panel__divider" style={{ gap: 10 }}>
            {Object.entries(META_RELATION_LABELS).map(([pred, label]) => {
              const refs = node.metadata?.[pred]
              if (!refs || !isRelatedList(refs)) return null
              return (
                <div key={pred} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="desktop-panel__meta">{label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {refs.map(r => (
                      <span key={r.slug} className="desktop-panel__tag">{r.label}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {node.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {node.tags.map(tag => (
              <span key={tag} className="desktop-panel__tag desktop-panel__tag--dim">{tag}</span>
            ))}
          </div>
        )}

        {conns.length > 0 && (
          <div className="desktop-panel__divider" style={{ gap: 12 }}>
            <div className="desktop-panel__section">CONEXIONES</div>
            {Object.entries(byPred).map(([pred, cs]) => (
              <div key={pred} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div className="desktop-panel__meta">{PRED_LABELS[pred] ?? pred}</div>
                {cs.map(c => (
                  <div key={c.id} className="desktop-panel__subtitle">{c.label}</div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="desktop-panel__footer">{node.id}</div>
      </>)}
    </div>
  )
}

function hasLiteralMeta(node: TNode): boolean {
  if (node.founded || node.ciclo) return true
  if (!node.metadata) return false
  return Object.keys(META_LITERAL_LABELS).some(k => typeof node.metadata?.[k] === 'string' && node.metadata[k])
}

function hasRelationMeta(node: TNode): boolean {
  if (!node.metadata) return false
  return Object.keys(META_RELATION_LABELS).some(k => {
    const v = node.metadata?.[k]
    return v && isRelatedList(v)
  })
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="desktop-panel__value">
      <span className="desktop-panel__value-label">{k}</span>
      <span className="desktop-panel__value-text">{v}</span>
    </div>
  )
}
