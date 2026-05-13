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
      color: 'color-mix(in srgb, var(--color-fg) 28%, transparent)',
      lineHeight: 1.6,
    }}>
      <span>— —  alianza</span>
      <span>· · ·  cubre tema</span>
      <span>———  asesora</span>
      <span>—·—  cita</span>
    </div>
  )
}
