import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { aplicarTema, lerTema } from './lib/tema'

aplicarTema(lerTema())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
