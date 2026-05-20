import type { QuipuSummary } from '../../types/graph'
import { UI_TEXT, UI_COLOR, toReactStyle } from '../../config/typography'

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
      background: 'color-mix(in srgb, var(--color-bg) 62%, transparent)',
      backdropFilter: 'blur(6px)',
      border: `1px solid ${UI_COLOR.borderSubtle}`,
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
              ...toReactStyle(UI_TEXT.navLabel),
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid transparent',
              background: isActive ? 'color-mix(in srgb, var(--color-accent) 18%, transparent)' : 'transparent',
              color: isActive
                ? UI_COLOR.accent
                : isAvailable
                  ? UI_COLOR.fgBright
                  : UI_COLOR.fgFaint,
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
