import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // <--- IMPORT APP, NOT DASHBOARD
import './index.css' // (Keep this if you have it)
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />  {/* <--- RENDER APP, NOT DASHBOARD */}
    </BrowserRouter>
  </React.StrictMode>,
)