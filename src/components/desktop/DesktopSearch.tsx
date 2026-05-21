interface DesktopSearchProps {
  value: string
  onChange: (v: string) => void
}

export function DesktopSearch({ value, onChange }: DesktopSearchProps) {
  return (
    <div className="desktop-search">
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="buscar nodos..."
        className="desktop-search__input"
        aria-label="Buscar nodos"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
      />
    </div>
  )
}
