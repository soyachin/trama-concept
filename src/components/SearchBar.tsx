interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  offset: boolean
}

export function SearchBar({ value, onChange, offset }: SearchBarProps) {
  return (
    <div style={{
      position: 'absolute', bottom: 26,
      left: offset ? 'calc(50% - 146px)' : '50%',
      transform: offset ? 'none' : 'translateX(-50%)',
      zIndex: 20,
      transition: 'left 0.35s cubic-bezier(0.22,1,0.36,1)',
    }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="buscar nodos..."
        style={{
          background: 'var(--color-bg-input)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-fg)',
          padding: '9px 18px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11.5,
          outline: 'none',
          width: 252,
          letterSpacing: '0.04em',
        }}
      />
    </div>
  )
}
