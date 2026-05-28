// lectura cacheada de tokens css para contextos canvas.
// los componentes react usan var(--color-*) directamente; este módulo
// resuelve los valores una vez y los expone como strings para ctx.font,
// ctx.fillStyle, etc. llamar refreshTokens() si los tokens cambian
// en runtime (ej: cambio de tema).
//
// Protocolo: computeAreaColors (pura) → applyAreaColors (DOM, cache).
// Separamos cálculo de efectos para evitar estado global mutable de módulo.

import { parse, converter } from 'culori'

const toRgb = converter('rgb')

let _bg  = ''
let _fg  = ''
let _acc = ''
let _fontSerif = ''
let _fontMono  = ''
let _fontWordmark = ''

let _areaColors: Record<string, [number, number, number]> = {}

const AREA_PALETTE = [
  'oklch(68% 0.18 264)',
  'oklch(72% 0.16 42)',
  'oklch(70% 0.17 142)',
  'oklch(75% 0.15 320)',
  'oklch(65% 0.16 200)',
  'oklch(78% 0.14 80)',
  'oklch(60% 0.18 30)',
  'oklch(70% 0.13 160)',
]

export interface AreaColorEntry {
  key: string
  varName: string
  cssValue: string
  rgb: [number, number, number]
}

export interface AreaColorMap {
  entries: AreaColorEntry[]
}

function tokenName(key: string): string {
  return '--color-area-' + key.toLowerCase().replace(/\s+/g, '-')
}

function pickAreaColor(idx: number): string {
  if (idx < AREA_PALETTE.length) return AREA_PALETTE[idx]!
  const hue = ((idx + 1) * 47) % 360
  return `oklch(70% 0.15 ${hue})`
}

export function computeAreaColors(groups: { key: string }[]): AreaColorMap {
  const entries: AreaColorEntry[] = []

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]!
    const varName = tokenName(g.key)
    const cssValue = pickAreaColor(i)
    const parsed = parse(cssValue)
    let rgb: [number, number, number] = [100, 149, 237]
    if (parsed) {
      const c = toRgb(parsed)
      if (c) {
        rgb = [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)]
      }
    }
    entries.push({ key: g.key, varName, cssValue, rgb })
  }

  return { entries }
}

let _dynamicVars: string[] = []

export function applyAreaColors(map: AreaColorMap): void {
  const root = document.documentElement

  for (const v of _dynamicVars) {
    root.style.removeProperty(v)
  }
  _dynamicVars = []
  _areaColors = {}

  for (const e of map.entries) {
    root.style.setProperty(e.varName, e.cssValue)
    _dynamicVars.push(e.varName)
    _areaColors[e.key] = e.rgb
    _areaColors[e.key.toLowerCase()] = e.rgb
  }

  refreshTokens()
}

export function assignAreaColors(groups: { key: string }[]) {
  applyAreaColors(computeAreaColors(groups))
}

export function bg()        { return _bg }
export function fg()        { return _fg }
export function acc()       { return _acc }
export function fontSerif() { return _fontSerif }
export function fontMono()  { return _fontMono }
export function fontWordmark() { return _fontWordmark }

export function areaColor(groupKey: string | undefined): [number, number, number] {
  if (!groupKey) return [100, 149, 237]
  const direct = _areaColors[groupKey]
  if (direct) return direct
  const lower = _areaColors[groupKey.toLowerCase()]
  if (lower) return lower
  return [100, 149, 237]
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
