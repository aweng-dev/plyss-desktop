import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installApiBridge } from './desktop/api'
import App from './App'
import './desktop/fonts'
import './index.css'

// Redirect API calls through the Electron main process before any UI mounts.
installApiBridge()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
