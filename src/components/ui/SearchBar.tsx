interface SearchBarProps {
  value: string
  onChange: (v: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="trama-search">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="buscar nodos..."
        className="trama-search__input"
        aria-label="Buscar nodos"
      />
    </div>
  )
}
