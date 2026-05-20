import { useMemo } from 'react'
import type { TNode, NodeMetaValue, RelatedRef } from '../../types/graph'
import { UI_TEXT, UI_COLOR, toReactStyle } from '../../config/typography'

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

// Predicados cuyo objeto vive en hidden_types del quipu (carrera, docente,
// curso). Se renderizan en el panel como chips o lista enlazada.
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

interface InfoPanelProps {
  node: TNode | null
  onClose: () => void
  getConns: (id: string) => { predicate: string; id: string; label: string }[]
}

export function InfoPanel({ node, onClose, getConns }: InfoPanelProps) {
  const conns = useMemo(() => (node ? getConns(node.id) : []), [node, getConns])
  const byPred = useMemo(() =>
    conns.reduce<Record<string, typeof conns>>((acc, c) => {
      ;(acc[c.predicate] ??= []).push(c)
      return acc
    }, {}),
    [conns]
  )

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 'var(--panel-width)',
      background: UI_COLOR.bgPanel,
      borderLeft: `1px solid ${UI_COLOR.borderVisible}`,
      boxShadow: 'var(--shadow-panel)',
      padding: '26px 20px',
      color: UI_COLOR.fg,
      overflowY: 'auto',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      transform: node ? 'translateX(0)' : 'translateX(100%)',
      transition: 'var(--transition-panel)',
    }}>
      {node && (<>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            background: 'none',
            border: 'none',
            color: UI_COLOR.fgVerySubtle,
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
            padding: 4,
          }}
        >×</button>

        <div style={{
          ...toReactStyle(UI_TEXT.panelKind),
          color: UI_COLOR.accent,
        }}>
          {TYPE_LABELS[node.type] ?? node.type}
        </div>

        <div style={{
          ...toReactStyle(UI_TEXT.panelTitle),
          color: UI_COLOR.fg,
        }}>
          {node.label}
        </div>

        {node.description && (
          <div style={{
            ...toReactStyle(UI_TEXT.panelBody),
            color: UI_COLOR.fgMuted,
          }}>
            {node.description}
          </div>
        )}

        {hasLiteralMeta(node) && (
          <div style={{
            borderTop: `1px solid ${UI_COLOR.borderSubtle}`,
            paddingTop: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}>
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
          <div style={{
            borderTop: `1px solid ${UI_COLOR.borderSubtle}`,
            paddingTop: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {Object.entries(META_RELATION_LABELS).map(([pred, label]) => {
              const refs = node.metadata?.[pred]
              if (!refs || !isRelatedList(refs)) return null
              return (
                <div key={pred} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{
                    ...toReactStyle(UI_TEXT.panelMeta),
                    color: UI_COLOR.fgSubtle,
                  }}>
                    {label}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {refs.map(r => (
                      <span key={r.slug} style={{
                        ...toReactStyle(UI_TEXT.panelTag),
                        padding: '3px 8px',
                        border: `1px solid ${UI_COLOR.border}`,
                        borderRadius: 999,
                        color: UI_COLOR.fgVeryBright,
                      }}>
                        {r.label}
                      </span>
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
              <span key={tag} style={{
                ...toReactStyle(UI_TEXT.panelTag),
                padding: '2px 7px',
                border: `1px solid ${UI_COLOR.border}`,
                color: UI_COLOR.fgDim,
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {conns.length > 0 && (
          <div style={{
            borderTop: `1px solid ${UI_COLOR.borderSubtle}`,
            paddingTop: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{
              ...toReactStyle(UI_TEXT.panelSection),
              color: UI_COLOR.accent,
            }}>
              CONEXIONES
            </div>
            {Object.entries(byPred).map(([pred, cs]) => (
              <div key={pred} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{
                  ...toReactStyle(UI_TEXT.panelMeta),
                  color: UI_COLOR.fgSubtle,
                }}>
                  {PRED_LABELS[pred] ?? pred}
                </div>
                {cs.map(c => (
                  <div key={c.id} style={{
                    ...toReactStyle(UI_TEXT.panelSubtitle),
                    color: UI_COLOR.fgBright,
                    paddingLeft: 9,
                    borderLeft: `1px solid ${UI_COLOR.accentBorder}`,
                  }}>
                    {c.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div style={{
          marginTop: 'auto',
          borderTop: `1px solid ${UI_COLOR.borderSubtle}`,
          paddingTop: 10,
          ...toReactStyle(UI_TEXT.panelMeta),
          color: UI_COLOR.border,
          wordBreak: 'break-all',
        }}>
          {node.id}
        </div>
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
    <div style={{ display: 'flex', gap: 8, ...toReactStyle(UI_TEXT.panelValue) }}>
      <span style={{ color: UI_COLOR.fgVerySubtle, minWidth: 52 }}>{k}</span>
      <span style={{ color: UI_COLOR.fgMuted }}>{v}</span>
    </div>
  )
}
