// lectura cacheada de tokens css para contextos canvas.
// los componentes react usan var(--color-*) directamente; este módulo
// resuelve los valores una vez y los expone como strings para ctx.font,
// ctx.fillStyle, etc. llamar refreshTokens() si los tokens cambian
// en runtime (ej: cambio de tema).

import { parse, converter } from 'culori'

const toRgb = converter('rgb')

let _bg  = ''
let _fg  = ''
let _acc = ''
let _fontSerif = ''
let _fontMono  = ''
let _fontWordmark = ''

// colores de área cacheados: groupKey -> [r, g, b] (0-255)
let _areaColors: Record<string, [number, number, number]> = {}

function cssVarToRgb(s: CSSStyleDeclaration, name: string): [number, number, number] | null {
  const raw = s.getPropertyValue(name).trim()
  if (!raw) return null
  const color = parse(raw)
  if (!color) return null
  const rgb = toRgb(color)
  if (!rgb) return null
  return [Math.round(rgb.r * 255), Math.round(rgb.g * 255), Math.round(rgb.b * 255)]
}

function tokenName(key: string): string {
  return '--color-area-' + key.toLowerCase().replace(/\s+/g, '-')
}

export function refreshTokens() {
  const s = getComputedStyle(document.documentElement)
  _bg       = s.getPropertyValue('--color-bg').trim()
  _fg       = s.getPropertyValue('--color-fg').trim()
  _acc      = s.getPropertyValue('--color-accent').trim()
  _fontSerif = s.getPropertyValue('--font-serif').trim()
  _fontMono  = s.getPropertyValue('--font-mono').trim()
  _fontWordmark = s.getPropertyValue('--font-wordmark').trim()

  // recargar colores de área
  const fresh: Record<string, [number, number, number]> = {}
  const defaultColor = cssVarToRgb(s, '--color-area-default')

  // leer todos los tokens que empiecen con --color-area-
  // (no hay API estándar para listar custom properties, así que
  // hardcodeamos las áreas conocidas y usamos default para el resto)
  const knownAreas = ['especializada', 'arte-cultura', 'clubes-deportivos']
  for (const area of knownAreas) {
    const rgb = cssVarToRgb(s, tokenName(area))
    if (rgb) fresh[area] = rgb
  }

  // mapeo por groupKey exacto (puede venir con espacios/mayúsculas del API)
  _areaColors = {}
  const addMapping = (key: string, rgb: [number, number, number]) => {
    _areaColors[key] = rgb
    _areaColors[key.toLowerCase()] = rgb
  }

  if (fresh['especializada']) addMapping('Especializada', fresh['especializada'])
  if (fresh['arte-cultura']) addMapping('Arte y Cultura', fresh['arte-cultura'])
  if (fresh['clubes-deportivos']) addMapping('Clubes Deportivos', fresh['clubes-deportivos'])

  // fallback para cualquier área no conocida (resuelto lazy en areaColor())
  _areaColors['__default__'] = defaultColor ?? [100, 149, 237]
}

export function bg()        { return _bg }
export function fg()        { return _fg }
export function acc()       { return _acc }
export function fontSerif() { return _fontSerif }
export function fontMono()  { return _fontMono }
export function fontWordmark() { return _fontWordmark }

/** Devuelve [r, g, b] para un groupKey de área. Fallback a default. */
export function areaColor(groupKey: string | undefined): [number, number, number] {
  if (!groupKey) return _areaColors['__default__']
  const direct = _areaColors[groupKey]
  if (direct) return direct
  const lower = _areaColors[groupKey.toLowerCase()]
  if (lower) return lower
  return _areaColors['__default__']
}
