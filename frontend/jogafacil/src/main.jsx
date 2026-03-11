import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AcademyProvider } from './context/AcademyContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AcademyProvider>
      <App />
    </AcademyProvider>
  </StrictMode>,
)
