import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/Auth.jsx'
import { ToastProvider } from './components/Toast.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider><ToastProvider>
        <App />
      </ToastProvider></AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
