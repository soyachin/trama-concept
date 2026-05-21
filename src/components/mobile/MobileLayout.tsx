import type { ReactNode } from 'react'

interface MobileLayoutProps {
  wordmark: ReactNode
  search: ReactNode
  selector: ReactNode
  infoPanel: ReactNode
  legend: ReactNode
}

export function MobileLayout({ wordmark, search, selector, infoPanel, legend }: MobileLayoutProps) {
  return (
    <div className="mobile-layout">
      {/* Canvas is rendered separately in parent */}
      
      <header className="mobile-layout__top">
        <div className="mobile-layout__wordmark">{wordmark}</div>
        <div className="mobile-layout__search">{search}</div>
      </header>

      <div className="mobile-layout__controls">
        {selector}
      </div>

      {infoPanel}

      <footer className="mobile-layout__bottom">
        {legend}
      </footer>
    </div>
  )
}
