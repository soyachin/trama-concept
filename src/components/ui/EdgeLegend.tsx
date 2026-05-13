export function EdgeLegend() {
  return (
    <div style={{
      position: 'absolute',
      bottom: 26,
      left: 22,
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      fontFamily: 'var(--font-mono)',
      fontSize: 8.5,
      color: 'color-mix(in srgb, var(--color-fg) 72%, transparent)',
      lineHeight: 1.6,
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border-visible)',
      borderRadius: 4,
      padding: '10px 14px',
      boxShadow: 'var(--shadow-ui)',
    }}>
      <span>— —  alianza</span>
      <span>· · ·  cubre tema</span>
      <span>———  asesora</span>
      <span>—·—  cita</span>
    </div>
  )
}
