import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { refreshTokens } from './lib/tokens'
import App from './App.tsx'

refreshTokens()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
