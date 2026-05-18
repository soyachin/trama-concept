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
      background: 'var(--color-bg-panel)',
      borderLeft: '1px solid var(--color-border-visible)',
      boxShadow: 'var(--shadow-panel)',
      padding: '26px 20px',
      color: 'var(--color-fg)',
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
            color: 'color-mix(in srgb, var(--color-fg) 35%, transparent)',
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
            padding: 4,
          }}
        >×</button>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          color: 'var(--color-accent)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>
          {TYPE_LABELS[node.type] ?? node.type}
        </div>

        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 23,
          fontStyle: 'italic',
          lineHeight: 1.15,
          color: 'var(--color-fg)',
        }}>
          {node.label}
        </div>

        {node.description && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            color: 'color-mix(in srgb, var(--color-fg) 58%, transparent)',
            lineHeight: 1.65,
          }}>
            {node.description}
          </div>
        )}

        {hasLiteralMeta(node) && (
          <div style={{
            borderTop: '1px solid var(--color-border-subtle)',
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
            borderTop: '1px solid var(--color-border-subtle)',
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
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8.5,
                    color: 'color-mix(in srgb, var(--color-fg) 32%, transparent)',
                    letterSpacing: '0.08em',
                  }}>
                    {label}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {refs.map(r => (
                      <span key={r.slug} style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        padding: '3px 8px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 999,
                        color: 'color-mix(in srgb, var(--color-fg) 70%, transparent)',
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
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                padding: '2px 7px',
                border: '1px solid var(--color-border)',
                color: 'color-mix(in srgb, var(--color-fg) 45%, transparent)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {conns.length > 0 && (
          <div style={{
            borderTop: '1px solid var(--color-border-subtle)',
            paddingTop: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--color-accent)',
              letterSpacing: '0.14em',
            }}>
              CONEXIONES
            </div>
            {Object.entries(byPred).map(([pred, cs]) => (
              <div key={pred} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  color: 'color-mix(in srgb, var(--color-fg) 32%, transparent)',
                  letterSpacing: '0.08em',
                }}>
                  {PRED_LABELS[pred] ?? pred}
                </div>
                {cs.map(c => (
                  <div key={c.id} style={{
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    fontSize: 14,
                    color: 'color-mix(in srgb, var(--color-fg) 78%, transparent)',
                    paddingLeft: 9,
                    borderLeft: '1px solid var(--color-accent-border)',
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
          borderTop: '1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)',
          paddingTop: 10,
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          color: 'var(--color-border)',
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
    <div style={{ display: 'flex', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 9.5 }}>
      <span style={{ color: 'color-mix(in srgb, var(--color-fg) 30%, transparent)', minWidth: 52 }}>{k}</span>
      <span style={{ color: 'color-mix(in srgb, var(--color-fg) 55%, transparent)' }}>{v}</span>
    </div>
  )
}
