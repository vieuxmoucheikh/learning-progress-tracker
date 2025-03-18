import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Auth } from './components/Auth'
import './index.css'
import 'react-day-picker/dist/style.css'
import { AuthProvider } from './lib/auth'
import AuthCallback from './pages/auth/callback'
import Dashboard from './pages/dashboard'
import './styles/global-ui-enhancements.css'
import './styles/critical-light-mode-fixes.css' // Ajout du fichier de correctifs critiques
import '../public/emergency-mobile-fix.css' // Ajout du correctif d'urgence

// Ajouter un style critique pour les statuts et compteurs
const styleFixForStatuses = document.createElement('style');
styleFixForStatuses.textContent = `
  /* Ultra-specific fixes for session status and counters */
  html[data-theme="dark"] .badge.capitalize.font-medium {
    font-weight: 700 !important;
    border-width: 2px !important;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.7) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.03em !important;
  }
  
  /* Session status badges */
  html[data-theme="dark"] .badge.capitalize.font-medium.dark\\:bg-blue-800\\/30 {
    background-color: rgba(30, 64, 175, 0.7) !important;
    color: white !important;
    border: 2px solid rgba(59, 130, 246, 0.8) !important;
  }
  
  html[data-theme="dark"] .badge.capitalize.font-medium.dark\\:bg-green-800\\/30 {
    background-color: rgba(22, 101, 52, 0.7) !important;
    color: white !important;
    border: 2px solid rgba(34, 197, 94, 0.8) !important;
  }
  
  html[data-theme="dark"] .badge.capitalize.font-medium.dark\\:bg-yellow-800\\/30 {
    background-color: rgba(133, 77, 14, 0.7) !important;
    color: white !important;
    border: 2px solid rgba(245, 158, 11, 0.8) !important;
  }
  
  /* Counters */
  html[data-theme="dark"] .bg-blue-500\\/10 {
    background-color: rgba(30, 64, 175, 0.3) !important;
    color: white !important;
    border: 2px solid rgba(59, 130, 246, 0.7) !important;
    font-weight: 700 !important;
    border-radius: 9999px !important;
    padding: 0.25rem 0.5rem !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  }
  
  html[data-theme="dark"] .bg-green-500\\/10 {
    background-color: rgba(22, 101, 52, 0.3) !important;
    color: white !important;
    border: 2px solid rgba(34, 197, 94, 0.7) !important;
    font-weight: 700 !important;
    border-radius: 9999px !important;
    padding: 0.25rem 0.5rem !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  }
  
  /* All possible status texts */
  html[data-theme="dark"] .text-sm.font-medium.text-gray-600,
  html[data-theme="dark"] span.text-gray-600 {
    color: white !important;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5) !important;
  }
`;
document.head.appendChild(styleFixForStatuses);

function Root() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
