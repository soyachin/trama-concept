import type { ReactNode } from 'react'

interface DesktopLayoutProps {
  wordmark: ReactNode
  selector: ReactNode
  stats: ReactNode
  infoPanel: ReactNode
  legend: ReactNode
  search: ReactNode
}

export function DesktopLayout({ wordmark, selector, stats, infoPanel, legend, search }: DesktopLayoutProps) {
  return (
    <div className="desktop-layout">
      {/* Canvas is rendered separately in parent */}
      
      <header className="desktop-layout__top">
        <div className="desktop-layout__wordmark">{wordmark}</div>
        <div className="desktop-layout__selector">{selector}</div>
        <div className="desktop-layout__stats">{stats}</div>
      </header>

      <aside className="desktop-layout__panel">
        {infoPanel}
      </aside>

      <footer className="desktop-layout__bottom">
        <div className="desktop-layout__legend">{legend}</div>
        <div className="desktop-layout__search">{search}</div>
      </footer>
    </div>
  )
}
