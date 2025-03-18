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

// Injecter un style critique pour assurer la visibilité des compteurs et statuts
const injectCriticalStyles = () => {
  const styleElement = document.createElement('style');
  styleElement.setAttribute('id', 'critical-status-counters-fix');
  styleElement.textContent = `
    /* CORRECTIFS INJECTÉS DIRECTEMENT POUR LES STATUTS ET COMPTEURS */
    html[data-theme="dark"] .badge.capitalize.font-medium {
      font-weight: 700 !important;
      padding: 4px 10px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      border-width: 2px !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4) !important;
    }
    
    /* In Progress, On Hold, Completed avec fonds contrastés */
    html[data-theme="dark"] .badge:contains("In Progress") {
      background-color: rgba(37, 99, 235, 0.85) !important;
      color: white !important;
      border-color: #60a5fa !important;
    }
    
    html[data-theme="dark"] .badge:contains("On Hold") {
      background-color: rgba(202, 138, 4, 0.85) !important;
      color: white !important;
      border-color: #fcd34d !important;
    }
    
    html[data-theme="dark"] .badge:contains("Completed") {
      background-color: rgba(22, 163, 74, 0.85) !important;
      color: white !important;
      border-color: #4ade80 !important;
    }
    
    /* Compteurs en haut à droite */
    html[data-theme="dark"] .bg-blue-500\\/10, 
    html[data-theme="dark"] .bg-green-500\\/10 {
      background-color: rgba(15, 23, 42, 0.85) !important;
      color: white !important;
      border: 2px solid rgba(148, 163, 184, 0.7) !important;
      font-weight: 700 !important;
      padding: 4px 10px !important;
      border-radius: 9999px !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4) !important;
    }
    
    /* Active Tasks */
    html[data-theme="dark"] .bg-blue-500\\/10 {
      background-color: rgba(37, 99, 235, 0.85) !important;
      border-color: #60a5fa !important;
    }
    
    /* Completed Today */
    html[data-theme="dark"] .bg-green-500\\/10 {
      background-color: rgba(22, 163, 74, 0.85) !important;
      border-color: #4ade80 !important;
    }
    
    /* Status dans les sessions (Current Session ou Session Paused) */
    html[data-theme="dark"] .text-blue-600.dark\\:text-blue-400.bg-blue-50\\/50.dark\\:bg-blue-900\\/20 {
      background-color: rgba(37, 99, 235, 0.7) !important;
      color: white !important;
      border: 2px solid rgba(59, 130, 246, 0.7) !important;
      font-weight: 700 !important;
      padding: 5px 10px !important;
      border-radius: 999px !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4) !important;
    }
  `;
  
  document.head.appendChild(styleElement);
};

// S'assurer que les styles sont injectés au chargement de la page
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', injectCriticalStyles);
  // Aussi injecter immédiatement au cas où le DOM est déjà chargé
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    injectCriticalStyles();
  }
}

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
