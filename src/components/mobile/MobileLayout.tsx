import type { ReactNode } from 'react'

interface MobileLayoutProps {
  wordmark: ReactNode
  search: ReactNode
  quipuMenu: ReactNode
  infoPanel: ReactNode
  legend: ReactNode
}

export function MobileLayout({ wordmark, search, quipuMenu, infoPanel, legend }: MobileLayoutProps) {
  return (
    <div className="mobile-layout">
      {/* Canvas is rendered separately in parent */}
      
      <header className="mobile-layout__top">
        <div className="mobile-layout__wordmark">{wordmark}</div>
        <div className="mobile-layout__search">{search}</div>
      </header>

      {infoPanel}

      <footer className="mobile-layout__bottom">
        {legend}
        <div className="mobile-layout__quipu">{quipuMenu}</div>
      </footer>
    </div>
  )
}
