import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { AppProvider } from './context/AppContext'
import './index.css'

// API errors are already shown as toasts by useAction; don't also surface them
// as uncaught promise rejections.
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.status) e.preventDefault()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AppProvider>
          <App />
        </AppProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
