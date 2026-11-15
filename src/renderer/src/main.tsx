import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { installRipples } from './fx'
import { installMockApi } from './mockApi'

if (!window.api) installMockApi()
installRipples()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
