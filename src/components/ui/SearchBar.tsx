import { UI_TEXT, UI_COLOR, toReactStyle } from '../../config/typography'

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  offset: boolean
}

export function SearchBar({ value, onChange, offset }: SearchBarProps) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 26,
      left: offset ? 'calc(50% - 146px)' : '50%',
      transform: offset ? 'none' : 'translateX(-50%)',
      zIndex: 20,
      transition: 'left 0.35s cubic-bezier(0.22,1,0.36,1)',
      background: UI_COLOR.bgElevated,
      border: `1px solid ${UI_COLOR.borderVisible}`,
      borderRadius: 4,
      boxShadow: 'var(--shadow-ui)',
    }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="buscar nodos..."
        style={{
          background: 'transparent',
          border: 'none',
          color: UI_COLOR.fg,
          padding: '9px 18px',
          ...toReactStyle(UI_TEXT.searchInput),
          outline: 'none',
          width: 252,
        }}
      />
    </div>
  )
}
