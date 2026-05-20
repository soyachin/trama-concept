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

// vars CSS que seteamos dinámicamente (para limpiar entre quipus)
let _dynamicVars: string[] = []

// paleta oklch para asignación automática de áreas
const AREA_PALETTE = [
  'oklch(68% 0.18 264)',   // azul
  'oklch(72% 0.16 42)',    // naranja
  'oklch(70% 0.17 142)',   // verde
  'oklch(75% 0.15 320)',   // magenta
  'oklch(65% 0.16 200)',   // cyan
  'oklch(78% 0.14 80)',    // amarillo
  'oklch(60% 0.18 30)',    // rojo
  'oklch(70% 0.13 160)',   // teal
]

let _nextPaletteIdx = 0

function tokenName(key: string): string {
  return '--color-area-' + key.toLowerCase().replace(/\s+/g, '-')
}

function pickAreaColor(): string {
  if (_nextPaletteIdx < AREA_PALETTE.length) {
    return AREA_PALETTE[_nextPaletteIdx++]
  }
  // generar color adicional con hue espaciado (47 es primo → buena distribución)
  const hue = (_nextPaletteIdx * 47) % 360
  _nextPaletteIdx++
  return `oklch(70% 0.15 ${hue})`
}

export function refreshTokens() {
  const s = getComputedStyle(document.documentElement)
  _bg       = s.getPropertyValue('--color-bg').trim()
  _fg       = s.getPropertyValue('--color-fg').trim()
  _acc      = s.getPropertyValue('--color-accent').trim()
  _fontSerif = s.getPropertyValue('--font-serif').trim()
  _fontMono  = s.getPropertyValue('--font-mono').trim()
  _fontWordmark = s.getPropertyValue('--font-wordmark').trim()
}

/** Asigna colores de área secuencialmente desde la paleta oklch.
 *  No repite colores dentro del mismo quipu. Si hay más áreas que colores
 *  predefinidos, genera colores adicionales automáticamente.
 *  Limpia vars dinámicas de quipus anteriores y cachea los rgb. */
export function assignAreaColors(groups: { key: string }[]) {
  const root = document.documentElement

  // limpiar vars dinámicas anteriores
  for (const v of _dynamicVars) {
    root.style.removeProperty(v)
  }
  _dynamicVars = []
  _areaColors = {}
  _nextPaletteIdx = 0

  for (const g of groups) {
    const varName = tokenName(g.key)
    const color = pickAreaColor()

    root.style.setProperty(varName, color)
    _dynamicVars.push(varName)

    // cachear rgb directamente
    const parsed = parse(color)
    if (parsed) {
      const rgb = toRgb(parsed)
      if (rgb) {
        const val: [number, number, number] = [
          Math.round(rgb.r * 255),
          Math.round(rgb.g * 255),
          Math.round(rgb.b * 255),
        ]
        _areaColors[g.key] = val
        _areaColors[g.key.toLowerCase()] = val
      }
    }
  }

  refreshTokens()
}

export function bg()        { return _bg }
export function fg()        { return _fg }
export function acc()       { return _acc }
export function fontSerif() { return _fontSerif }
export function fontMono()  { return _fontMono }
export function fontWordmark() { return _fontWordmark }

/** Devuelve [r, g, b] para un groupKey de área. Fallback a default. */
export function areaColor(groupKey: string | undefined): [number, number, number] {
  if (!groupKey) return [100, 149, 237]
  const direct = _areaColors[groupKey]
  if (direct) return direct
  const lower = _areaColors[groupKey.toLowerCase()]
  if (lower) return lower
  return [100, 149, 237]
}
