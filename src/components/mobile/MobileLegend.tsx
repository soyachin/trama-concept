import { useRef, useEffect, useState } from 'react'
import { ROPE_CONFIGS } from '../../config/visuals'
import { TEXT, composeFont, COLOR, composeRgba } from '../../config/typography'

const LEGEND_ITEMS = [
  { pred: 'quipu',           label: 'quipu' },
  { pred: 'perteneceArea',   label: 'pertenece a área' },
  { pred: 'alianzaCon',      label: 'alianza' },
  { pred: 'organizadoPor',   label: 'organizado por' },
  { pred: 'coorganizadoPor', label: 'coorganizado' },
]

function drawLegendCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const width = 160
  canvas.width = width * dpr
  canvas.height = (LEGEND_ITEMS.length * 18 + 8) * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${LEGEND_ITEMS.length * 18 + 8}px`
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
}

export function MobileLegend() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      drawLegendCanvas(canvasRef.current)
    }
  }, [open])

  return (
    <div className="mobile-legend">
      <button
        onClick={() => setOpen(!open)}
        className="mobile-legend__btn"
        aria-label="Mostrar leyenda de cuerdas"
        aria-expanded={open}
      >
        ?
      </button>
      
      {open && (
        <div ref={popoverRef} className="mobile-legend__popover">
          <canvas ref={canvasRef} />
        </div>
      )}
    </div>
  )
}
