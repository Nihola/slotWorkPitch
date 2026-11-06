import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import { applyTheme } from './utils/theme'
import './index.css'

applyTheme()
try { window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme()) } catch { /* older browsers */ }
// The single-file build (for static hosting) uses hash URLs so deep links work without server rewrites.
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Router><App /></Router></React.StrictMode>)
