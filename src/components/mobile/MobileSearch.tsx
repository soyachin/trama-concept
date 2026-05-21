import { useState, useRef, useEffect } from 'react'

interface MobileSearchProps {
  value: string
  onChange: (v: string) => void
}

export function MobileSearch({ value, onChange }: MobileSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="mobile-search__icon-btn"
        aria-label="Abrir búsqueda"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
      </button>

      {isOpen && (
        <div className="mobile-search-modal">
          <div 
            ref={modalRef}
            className="mobile-search-modal__content"
          >
            <input
              ref={inputRef}
              type="search"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder="buscar nodos..."
              className="mobile-search-modal__input"
              aria-label="Buscar nodos"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
            />
            <button
              type="button"
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
              className="mobile-search-modal__close"
              aria-label="Cerrar búsqueda"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}
