import { useRef, useEffect } from 'react'
import { ROPE_CONFIGS } from '../../config/visuals'
import { TEXT, composeFont, COLOR, composeRgba } from '../../config/typography'

const LEGEND_ITEMS = [
  { pred: 'quipu',           label: 'quipu' },
  { pred: 'perteneceArea',   label: 'pertenece a área' },
  { pred: 'alianzaCon',      label: 'alianza' },
  { pred: 'organizadoPor',   label: 'organizado por' },
  { pred: 'coorganizadoPor', label: 'coorganizado' },
]

export function DesktopLegend() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = 160
    cv.width = width * dpr
    cv.height = (LEGEND_ITEMS.length * 18 + 8) * dpr
    cv.style.width = `${width}px`
    cv.style.height = `${LEGEND_ITEMS.length * 18 + 8}px`
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, LEGEND_ITEMS.length * 18 + 8)

    const legendCol = composeRgba(COLOR.legend)
    ctx.font = composeFont(TEXT.legendLabel)

    LEGEND_ITEMS.forEach((item, i) => {
      const y = 12 + i * 18
      const cfg = ROPE_CONFIGS[item.pred]
      if (!cfg) return

      for (let si = 0; si < cfg.strands; si++) {
        const off = (si - (cfg.strands - 1) / 2) * 1.8
        ctx.beginPath()
        ctx.moveTo(8, y + off)
        ctx.lineTo(42, y + off)
        ctx.strokeStyle = legendCol
        ctx.lineWidth = 0.9
        ctx.stroke()
      }

      ctx.fillStyle = legendCol
      ctx.fillText(item.label, 50, y + 3)
    })
  }, [])

  return (
    <div className="desktop-legend">
      <canvas ref={canvasRef} />
    </div>
  )
}
