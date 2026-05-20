// escala tipográfica semántica para canvas.
// cada entrada define un estilo visual completo (familia, peso, estilo,
// tamaño). el renderer consume estos estilos en vez de construir strings
// inline — cambiar la tipografía de un rol es editar este objeto, no
// tocar render.ts ni useGraphSimulation.ts.
//
// las familias se leen de tokens.ts (fuente única: css custom properties).
// los tamaños responsivos al zoom se manejan con arrays o funciones.

import { fontSerif, fontMono, fontWordmark } from '../lib/tokens'

export interface TextStyle {
  family: () => string
  weight: number
  style: 'normal' | 'italic'
  size: number
}

// compone un TextStyle a string compatible con ctx.font.
// formato css: "italic 600 14px 'EB Garamond', serif"
export function composeFont(ts: TextStyle, sizeOverride?: number): string {
  const s = ts.style === 'italic' ? 'italic ' : ''
  const w = ts.weight !== 400 ? `${ts.weight} ` : ''
  const sz = sizeOverride ?? ts.size
  return `${s}${w}${sz}px ${ts.family()}`
}

// ─── tokens de UI (React) ────────────────────────────────────────
// misma semántica que TEXT pero exporta objetos listos para
// atributo `style` de JSX.  la familia se resuelve vía función
// para que refreshTokens() en runtime se refleje sin recargar.

export interface UITextStyle {
  family: () => string
  size: number
  weight: number
  style: 'normal' | 'italic'
  lineHeight?: number
  letterSpacing?: string
  textTransform?: string
}

/** Convierte un UITextStyle a objeto compatible con `style={}` de React. */
export function toReactStyle(ts: UITextStyle): React.CSSProperties {
  return {
    fontFamily: ts.family(),
    fontSize: ts.size,
    fontWeight: ts.weight,
    fontStyle: ts.style,
    lineHeight: ts.lineHeight,
    letterSpacing: ts.letterSpacing,
    textTransform: ts.textTransform,
  }
}

export const UI_TEXT = {
  // título principal del panel (nombre del nodo)
  panelTitle: {
    family: fontSerif,
    size: 23,
    weight: 400,
    style: 'italic' as const,
    lineHeight: 1.15,
  },
  // subtítulo / conexiones en el panel
  panelSubtitle: {
    family: fontSerif,
    size: 14,
    weight: 400,
    style: 'italic' as const,
  },
  // cuerpo del panel (descripción)
  panelBody: {
    family: fontMono,
    size: 10.5,
    weight: 400,
    style: 'normal' as const,
    lineHeight: 1.65,
  },
  // etiquetas de metadatos en el panel
  panelMeta: {
    family: fontMono,
    size: 8.5,
    weight: 400,
    style: 'normal' as const,
  },
  // valores de metadatos en filas
  panelValue: {
    family: fontMono,
    size: 9.5,
    weight: 400,
    style: 'normal' as const,
  },
  // chips / tags
  panelTag: {
    family: fontMono,
    size: 9,
    weight: 400,
    style: 'normal' as const,
  },
  // etiqueta de sección "CONEXIONES"
  panelSection: {
    family: fontMono,
    size: 9,
    weight: 400,
    style: 'normal' as const,
    letterSpacing: '0.14em',
  },
  // tipo de nodo en el panel
  panelKind: {
    family: fontMono,
    size: 9.5,
    weight: 400,
    style: 'normal' as const,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
  },
  // buscador
  searchInput: {
    family: fontMono,
    size: 11.5,
    weight: 400,
    style: 'normal' as const,
    letterSpacing: '0.04em',
  },
  // wordmark "trama"
  wordmark: {
    family: fontWordmark,
    size: 32,
    weight: 400,
    style: 'normal' as const,
    letterSpacing: '0.04em',
  },
  // selector de quipus
  navLabel: {
    family: fontMono,
    size: 10,
    weight: 400,
    style: 'normal' as const,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  // stats en esquina
  stats: {
    family: fontMono,
    size: 10,
    weight: 400,
    style: 'normal' as const,
    letterSpacing: '0.08em',
  },
  // pantalla de carga
  loading: {
    family: fontSerif,
    size: 21,
    weight: 400,
    style: 'italic' as const,
  },
} satisfies Record<string, UITextStyle>

// estilos semánticos del canvas. cada uno corresponde a un contexto
// visual específico del grafo.
export const TEXT = {
  // label debajo de cada nodo (organizaciones, clubes, cursos, etc.)
  nodeLabel: {
    family: fontSerif,
    weight: 400,
    style: 'italic' as const,
    size: 12,
  },
  // cabecera de área ("Especializada", "Arte y Cultura", etc.)
  areaHeader: {
    family: fontSerif,
    weight: 400,
    style: 'italic' as const,
    size: 14,
  },
  // nombre del quipu raíz ("comunidad UTEC")
  rootWordmark: {
    family: fontSerif,
    weight: 400,
    style: 'italic' as const,
    size: 30,
  },
  // cita de la intro ("Trama es el mapa de...")
  introQuote: {
    family: fontSerif,
    weight: 400,
    style: 'italic' as const,
    size: 21,
  },
  // subtítulo de la intro ("Explora. Cada nodo es una puerta...")
  introSub: {
    family: fontMono,
    weight: 400,
    style: 'normal' as const,
    size: 12,
  },
  // call-to-action de la intro ("[ click para comenzar ]")
  introCta: {
    family: fontMono,
    weight: 400,
    style: 'normal' as const,
    size: 10,
  },
  // labels en la leyenda de cuerdas
  legendLabel: {
    family: fontMono,
    weight: 400,
    style: 'normal' as const,
    size: 8,
  },
} satisfies Record<string, TextStyle>

// ─── paleta semántica para canvas ────────────────────────────────
// misma idea que TEXT pero para colores. cada rol tiene un color base
// (función que lee de tokens.ts) y una opacidad por defecto. los
// renderers consumen roles en vez de construir rgba() inline.
//
// los colores por tipo de nodo (TYPE_COLORS) ya están tokenizados en
// visuals.ts / css custom properties — no se repiten aquí. este objeto
// cubre los colores de contexto (intro, labels, cuerdas, leyenda, etc.).

import { bg, fg, acc } from '../lib/tokens'

export interface ColorRole {
  base: () => string
  alpha: number
}

// genera rgba() string a partir de un ColorRole.
// acepta override de alpha para variaciones contextuales (hover, etc.)
export function composeRgba(
  role: ColorRole,
  alphaOverride?: number,
  rgb?: [number, number, number],
): string {
  const [r, g, b] = rgb ?? hexToRgb(role.base())
  const a = alphaOverride ?? role.alpha
  return `rgba(${r},${g},${b},${a})`
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export const COLOR = {
  // ─── canvas background ───
  canvasBg:       { base: bg,  alpha: 1 },

  // ─── cuerdas ───
  ropeBase:       { base: fg,  alpha: 0.11 },
  ropeActive:     { base: acc, alpha: 0.82 },

  // ─── labels de nodos ───
  labelBase:      { base: fg,  alpha: 1 },
  labelSelected:  { base: acc, alpha: 1 },

  // ─── raíz del quipu ───
  rootLabel:      { base: fg,  alpha: 1 },
  rootLine:       { base: acc, alpha: 0.55 },

  // ─── textura de fondo (woven) ───
  wovenLineH:     { base: fg,  alpha: 0.018 },
  wovenLineV:     { base: fg,  alpha: 0.014 },
  wovenDotFg:     { base: fg,  alpha: 0.025 },
  wovenDotAcc:    { base: acc, alpha: 0.02 },

  // ─── intro ───
  introBg:        { base: bg,  alpha: 0.92 },
  introText:      { base: fg,  alpha: 1 },
  introSub:       { base: fg,  alpha: 0.48 },
  introCta:       { base: acc, alpha: 0.65 },

  // ─── dissolve ───
  dissolveBg:     { base: bg,  alpha: 0.95 },

  // ─── leyenda ───
  legend:         { base: fg,  alpha: 0.28 },
} satisfies Record<string, ColorRole>

// ─── paleta semántica para React (inline styles) ─────────────────
// usa directamente las css custom properties del root; así un cambio
// de tema (ej. data-theme="dark") se refleja sin tocar JS.
// para canvas se sigue usando composeRgba(COLOR.…) más arriba.

export const UI_COLOR = {
  fg:                'var(--color-fg)',
  bg:                'var(--color-bg)',
  accent:            'var(--color-accent)',
  accentBorder:      'var(--color-accent-border)',

  fgMuted:           'color-mix(in srgb, var(--color-fg) 58%, transparent)',
  fgSubtle:          'color-mix(in srgb, var(--color-fg) 32%, transparent)',
  fgFaint:           'color-mix(in srgb, var(--color-fg) 22%, transparent)',
  fgBarely:          'color-mix(in srgb, var(--color-fg) 38%, transparent)',
  fgBright:          'color-mix(in srgb, var(--color-fg) 78%, transparent)',
  fgVeryBright:      'color-mix(in srgb, var(--color-fg) 70%, transparent)',
  fgDim:             'color-mix(in srgb, var(--color-fg) 45%, transparent)',
  fgVerySubtle:      'color-mix(in srgb, var(--color-fg) 30%, transparent)',

  border:            'var(--color-border)',
  borderSubtle:      'var(--color-border-subtle)',
  borderVisible:     'var(--color-border-visible)',

  bgPanel:           'var(--color-bg-panel)',
  bgElevated:        'var(--color-bg-elevated)',
} as const
