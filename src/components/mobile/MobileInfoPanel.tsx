import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
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

type SheetState = 'closed' | 'collapsed' | 'expanded'

interface MobileInfoPanelProps {
  node: TNode | null
  loading: boolean
  onClose: () => void
  getConns: (id: string) => { predicate: string; id: string; label: string }[]
}

export function MobileInfoPanel({ node, loading, onClose, getConns }: MobileInfoPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [sheetState, setSheetState] = useState<SheetState>('closed')
  
  const conns = useMemo(() => (node ? getConns(node.id) : []), [node, getConns])
  const byPred = useMemo(() =>
    conns.reduce<Record<string, typeof conns>>((acc, c) => {
      ;(acc[c.predicate] ??= []).push(c)
      return acc
    }, {}),
    [conns]
  )

  useEffect(() => {
    if (node) {
      setSheetState('collapsed')
    } else {
      setSheetState('closed')
    }
  }, [node?.id])

  // Swipe gestures
  useEffect(() => {
    const panel = panelRef.current
    if (!panel || sheetState === 'closed') return

    let startY = 0
    let currentY = 0
    let startState: SheetState = 'collapsed'
    let isDragging = false

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY = e.touches[0]!.clientY
        currentY = startY
        startState = sheetState
        isDragging = true
        panel.style.transition = 'none'
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return
      
      currentY = e.touches[0]!.clientY
      const deltaY = currentY - startY
      
      if (startState === 'collapsed' && deltaY > 0) {
        panel.style.transform = `translateY(calc(55% + ${deltaY}px))`
      } else if (startState === 'expanded' && deltaY > 0) {
        panel.style.transform = `translateY(calc(10% + ${deltaY}px))`
      }
    }

    const onTouchEnd = () => {
      if (!isDragging) return
      isDragging = false
      
      const deltaY = currentY - startY
      panel.style.transition = ''
      panel.style.transform = ''
      
      if (startState === 'collapsed') {
        if (deltaY > 80) {
          onClose()
        } else if (deltaY < -80) {
          setSheetState('expanded')
        } else {
          setSheetState('collapsed')
        }
      } else if (startState === 'expanded') {
        if (deltaY > 80) {
          setSheetState('collapsed')
        } else {
          setSheetState('expanded')
        }
      }
    }

    panel.addEventListener('touchstart', onTouchStart, { passive: true })
    panel.addEventListener('touchmove', onTouchMove, { passive: true })
    panel.addEventListener('touchend', onTouchEnd)

    return () => {
      panel.removeEventListener('touchstart', onTouchStart)
      panel.removeEventListener('touchmove', onTouchMove)
      panel.removeEventListener('touchend', onTouchEnd)
    }
  }, [sheetState, onClose])

  const toggleExpand = useCallback(() => {
    setSheetState(prev => prev === 'collapsed' ? 'expanded' : 'collapsed')
  }, [])

  const isOpen = sheetState !== 'closed'
  const isExpanded = sheetState === 'expanded'

  return (
    <div 
      ref={panelRef}
      className={`mobile-sheet ${isOpen ? 'mobile-sheet--open' : ''} ${isExpanded ? 'mobile-sheet--expanded' : ''}`}
    >
      {node && (<>
        <div 
          className="mobile-sheet__handle"
          onClick={toggleExpand}
          role="button"
          aria-label={isExpanded ? "Colapsar panel" : "Expandir panel"}
        >
          <div className="mobile-sheet__handle-bar" />
        </div>

        <button
          onClick={onClose}
          className="mobile-sheet__close"
          aria-label="Cerrar panel"
        >×</button>

        <div className="mobile-sheet__content">
          <div className="mobile-sheet__kind">{TYPE_LABELS[node.type] ?? node.type}</div>
          <div className="mobile-sheet__title">{node.label}</div>

          {node.description && (
            <div className="mobile-sheet__body">{node.description}</div>
          )}

          {loading ? (
            <div className="mobile-sheet__divider" style={{ gap: 10 }}>
              <div className="skeleton" style={{ height: 14, width: '55%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, width: '45%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 28, width: '70%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 28, width: '40%' }} />
            </div>
          ) : (<>
            {hasLiteralMeta(node) && (
              <div className="mobile-sheet__divider">
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
              <div className="mobile-sheet__divider" style={{ gap: 10 }}>
                {Object.entries(META_RELATION_LABELS).map(([pred, label]) => {
                  const refs = node.metadata?.[pred]
                  if (!refs || !isRelatedList(refs)) return null
                  return (
                    <div key={pred} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="mobile-sheet__meta">{label}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {refs.map(r => (
                          <span key={r.slug} className="mobile-sheet__tag">{r.label}</span>
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
                  <span key={tag} className="mobile-sheet__tag mobile-sheet__tag--dim">{tag}</span>
                ))}
              </div>
            )}
          </>)}

          {conns.length > 0 && (
            <div className="mobile-sheet__divider" style={{ gap: 12 }}>
              <div className="mobile-sheet__section">CONEXIONES</div>
              {Object.entries(byPred).map(([pred, cs]) => (
                <div key={pred} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div className="mobile-sheet__meta">{PRED_LABELS[pred] ?? pred}</div>
                  {cs.map(c => (
                    <div key={c.id} className="mobile-sheet__subtitle">{c.label}</div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="mobile-sheet__footer">{node.id}</div>
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
    <div className="mobile-sheet__value">
      <span className="mobile-sheet__value-label">{k}</span>
      <span className="mobile-sheet__value-text">{v}</span>
    </div>
  )
}
