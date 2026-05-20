// lectura cacheada de tokens css para contextos canvas.
// los componentes react usan var(--color-*) directamente; este módulo
// resuelve los valores una vez y los expone como strings para ctx.font,
// ctx.fillStyle, etc. llamar refreshTokens() si los tokens cambian
// en runtime (ej: cambio de tema).

let _bg  = ''
let _fg  = ''
let _acc = ''
let _fontSerif = ''
let _fontMono  = ''

export function refreshTokens() {
  const s = getComputedStyle(document.documentElement)
  _bg       = s.getPropertyValue('--color-bg').trim()
  _fg       = s.getPropertyValue('--color-fg').trim()
  _acc      = s.getPropertyValue('--color-accent').trim()
  _fontSerif = s.getPropertyValue('--font-serif').trim()
  _fontMono  = s.getPropertyValue('--font-mono').trim()
}

export function bg()        { return _bg }
export function fg()        { return _fg }
export function acc()       { return _acc }
export function fontSerif() { return _fontSerif }
export function fontMono()  { return _fontMono }
