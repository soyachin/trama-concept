import type { QuipuSummary } from '../../types/graph'

interface QuipuSelectorProps {
  quipus: QuipuSummary[]
  activeId: string | null
  onSelect: (id: string) => void
}

export function QuipuSelector({ quipus, activeId, onSelect }: QuipuSelectorProps) {

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 25,
      display: 'flex',
      gap: 4,
      background: 'rgba(15,14,11,0.62)',
      backdropFilter: 'blur(6px)',
      border: '1px solid rgba(240,237,228,0.08)',
      borderRadius: 999,
      padding: '4px 6px',
      pointerEvents: 'auto',
    }}>
      {quipus.map(q => {
        const isActive = q.id === activeId
        const isAvailable = q.status === 'active'
        return (
          <button
            key={q.id}
            disabled={!isAvailable}
            onClick={() => isAvailable && onSelect(q.id)}
            title={q.description + (isAvailable ? '' : ' · próximamente')}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid transparent',
              background: isActive ? 'rgba(200,117,58,0.18)' : 'transparent',
              color: isActive
                ? '#c8753a'
                : isAvailable
                  ? 'rgba(240,237,228,0.78)'
                  : 'rgba(240,237,228,0.22)',
              cursor: isAvailable ? 'pointer' : 'default',
              transition: 'all 160ms ease',
            }}
          >
            {q.label}
          </button>
        )
      })}
    </div>
  )
}
