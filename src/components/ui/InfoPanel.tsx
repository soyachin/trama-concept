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

interface InfoPanelProps {
  node: TNode | null
  onClose: () => void
  getConns: (id: string) => { predicate: string; id: string; label: string }[]
}

export function InfoPanel({ node, onClose, getConns }: InfoPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [sheetState, setSheetState] = useState<SheetState>('closed')
  const [isMobile, setIsMobile] = useState(false)
  
  const conns = useMemo(() => (node ? getConns(node.id) : []), [node, getConns])
  const byPred = useMemo(() =>
    conns.reduce<Record<string, typeof conns>>((acc, c) => {
      ;(acc[c.predicate] ??= []).push(c)
      return acc
    }, {}),
    [conns]
  )

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Open sheet when node changes
  useEffect(() => {
    if (node) {
      setSheetState('collapsed')
    } else {
      setSheetState('closed')
    }
  }, [node?.id])

  // Touch gesture handling for mobile bottom sheet
  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !isMobile || sheetState === 'closed') return

    let startY = 0
    let startState: SheetState = 'collapsed'
    let isDragging = false

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY
        startState = sheetState
        isDragging = true
        panel.style.transition = 'none'
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return
      
      const currentY = e.touches[0].clientY
      const deltaY = currentY - startY
      const windowHeight = window.innerHeight
      
      // Calculate position based on current state and drag
      let translateY = 0
      if (startState === 'collapsed') {
        translateY = Math.max(0, deltaY)
      } else if (startState === 'expanded') {
        const expandedOffset = windowHeight * 0.1
        translateY = Math.max(expandedOffset, expandedOffset + deltaY)
      }
      
      panel.style.transform = `translateY(${translateY}px)`
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return
      isDragging = false
      
      const endY = e.changedTouches[0].clientY
      const deltaY = endY - startY
      
      panel.style.transition = ''
      panel.style.transform = ''
      
      // Determine new state based on drag direction and distance
      if (startState === 'collapsed') {
        if (deltaY > 80) {
          // Dragged down enough -> close
          onClose()
        } else if (deltaY < -80) {
          // Dragged up enough -> expand
          setSheetState('expanded')
        } else {
          // Snap back to collapsed
          setSheetState('collapsed')
        }
      } else if (startState === 'expanded') {
        if (deltaY > 80) {
          // Dragged down enough -> collapse
          setSheetState('collapsed')
        } else {
          // Snap back to expanded
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
  }, [isMobile, sheetState, onClose])

  const toggleExpand = useCallback(() => {
    setSheetState(prev => prev === 'collapsed' ? 'expanded' : 'collapsed')
  }, [])

  const isOpen = sheetState !== 'closed'
  const isExpanded = sheetState === 'expanded'

  return (
    <div 
      ref={panelRef}
      className={`trama-info-panel ${isOpen ? 'trama-info-panel--open' : ''} ${isExpanded ? 'trama-info-panel--expanded' : ''}`}
    >
      {node && (<>
        {/* Drag handle for mobile */}
        {isMobile && (
          <div 
            className="trama-info-panel__handle"
            onClick={toggleExpand}
            role="button"
            aria-label={isExpanded ? "Colapsar panel" : "Expandir panel"}
          >
            <div className="trama-info-panel__handle-bar" />
          </div>
        )}

        <button
          onClick={onClose}
          className="trama-info-panel__close"
          aria-label="Cerrar panel"
        >×</button>

        <div ref={contentRef} className="trama-info-panel__content">
          <div className="trama-info-panel__kind">
            {TYPE_LABELS[node.type] ?? node.type}
          </div>

          <div className="trama-info-panel__title">
            {node.label}
          </div>

          {node.description && (
            <div className="trama-info-panel__body">
              {node.description}
            </div>
          )}

          {hasLiteralMeta(node) && (
            <div className="trama-info-panel__divider">
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
            <div className="trama-info-panel__divider" style={{ gap: 10 }}>
              {Object.entries(META_RELATION_LABELS).map(([pred, label]) => {
                const refs = node.metadata?.[pred]
                if (!refs || !isRelatedList(refs)) return null
                return (
                  <div key={pred} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="trama-info-panel__meta">
                      {label}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {refs.map(r => (
                        <span key={r.slug} className="trama-info-panel__tag">
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
                <span key={tag} className="trama-info-panel__tag trama-info-panel__tag--dim">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {conns.length > 0 && (
            <div className="trama-info-panel__divider" style={{ gap: 12 }}>
              <div className="trama-info-panel__section">
                CONEXIONES
              </div>
              {Object.entries(byPred).map(([pred, cs]) => (
                <div key={pred} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div className="trama-info-panel__meta">
                    {PRED_LABELS[pred] ?? pred}
                  </div>
                  {cs.map(c => (
                    <div key={c.id} className="trama-info-panel__subtitle">
                      {c.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="trama-info-panel__footer">
            {node.id}
          </div>
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
    <div className="trama-info-panel__value">
      <span className="trama-info-panel__value-label">{k}</span>
      <span className="trama-info-panel__value-text">{v}</span>
    </div>
  )
}
