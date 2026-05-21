import { useState, useRef, useEffect } from 'react'

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Close when clicking outside
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

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`trama-search ${isOpen ? 'trama-search--open' : ''}`}>
      {/* Desktop: always show input */}
      <div className="trama-search--desktop">
        <input
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="buscar nodos..."
          className="trama-search__input"
          aria-label="Buscar nodos"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>

      {/* Mobile: icon that expands */}
      <div className="trama-search--mobile">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="trama-search__icon-btn"
            aria-label="Abrir búsqueda"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="trama-search__form">
            <input
              ref={inputRef}
              type="search"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder="buscar nodos..."
              className="trama-search__input trama-search__input--mobile"
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
              className="trama-search__close"
              aria-label="Cerrar búsqueda"
            >
              ×
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
