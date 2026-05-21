import type { QuipuSummary } from '../../types/graph'

interface QuipuSelectorProps {
  quipus: QuipuSummary[]
  activeId: string | null
  onSelect: (id: string) => void
}

export function QuipuSelector({ quipus, activeId, onSelect }: QuipuSelectorProps) {

  return (
    <div className="trama-selector">
      {quipus.map(q => {
        const isActive = q.id === activeId
        const isAvailable = q.status === 'active'
        return (
          <button
            key={q.id}
            disabled={!isAvailable}
            onClick={() => isAvailable && onSelect(q.id)}
            title={q.description + (isAvailable ? '' : ' · próximamente')}
            className={`trama-selector__btn ${
              isActive ? 'trama-selector__btn--active' : 
              isAvailable ? 'trama-selector__btn--available' : 
              'trama-selector__btn--disabled'
            }`}
          >
            {q.label}
          </button>
        )
      })}
    </div>
  )
}
