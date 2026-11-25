import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // <--- IMPORT APP, NOT DASHBOARD
import './index.css' // (Keep this if you have it)
import { BrowserRouter } from 'react-router-dom'
import { applyTheme } from './theme.js'

// Baseline tokens (fonts, spacing, a neutral default accent) so every page —
// including pre-auth screens like Login — has them before Dashboard mounts
// and re-applies the signed-in user's real brand color.
applyTheme('light', '#3b82f6')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />  {/* <--- RENDER APP, NOT DASHBOARD */}
    </BrowserRouter>
  </React.StrictMode>,
)