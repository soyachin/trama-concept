import { useState, useRef, useEffect } from 'react'
import type { QuipuSummary } from '../../types/graph'

interface MobileQuipuMenuProps {
  quipus: QuipuSummary[]
  activeId: string | null
  onSelect: (id: string) => void
}

export function MobileQuipuMenu({ quipus, activeId, onSelect }: MobileQuipuMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleSelect = (id: string) => {
    onSelect(id)
    setIsOpen(false)
  }

  return (
    <div className="mobile-quipu-menu" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mobile-quipu-menu__btn"
        aria-label="Seleccionar quipu"
        aria-expanded={isOpen}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {isOpen && (
        <div className="mobile-quipu-menu__drawer">
          <div className="mobile-quipu-menu__title">Quipus</div>
          {quipus.map(q => {
            const isActive = q.id === activeId
            const isAvailable = q.status === 'active'
            return (
              <button
                key={q.id}
                disabled={!isAvailable}
                onClick={() => isAvailable && handleSelect(q.id)}
                className={`mobile-quipu-menu__item ${
                  isActive ? 'mobile-quipu-menu__item--active' : 
                  isAvailable ? 'mobile-quipu-menu__item--available' : 
                  'mobile-quipu-menu__item--disabled'
                }`}
              >
                <span className="mobile-quipu-menu__label">{q.label}</span>
                {!isAvailable && <span className="mobile-quipu-menu__badge">próx.</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
