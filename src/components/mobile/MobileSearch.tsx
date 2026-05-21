import { useState, useRef, useEffect } from 'react'

interface MobileSearchProps {
  value: string
  onChange: (v: string) => void
}

export function MobileSearch({ value, onChange }: MobileSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
    <div ref={containerRef} className="mobile-search">
      {!isOpen ? (
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
      ) : (
        <form 
          onSubmit={(e) => {
            e.preventDefault()
            setIsOpen(false)
          }} 
          className="mobile-search__form"
        >
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="buscar..."
            className="mobile-search__input"
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
            className="mobile-search__close"
            aria-label="Cerrar búsqueda"
          >
            ×
          </button>
        </form>
      )}
    </div>
  )
}
