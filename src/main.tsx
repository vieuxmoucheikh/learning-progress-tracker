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
  styleElement.setAttribute('id', 'critical-session-status-fix');
  styleElement.textContent = `
    /* CORRECTIFS CRITIQUES ULTRA-CIBLÉS POUR LES SESSIONS ET COMPTEURS */
    
    /* 1. STATUTS DE SESSION - Pour tous les badges dans les cartes de session */
    .border.rounded-xl .badge,
    .rounded-xl .badge.capitalize {
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.03em !important;
      border-width: 2px !important;
      padding: 0.25rem 0.5rem !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15) !important;
    }
    
    /* En mode sombre, les badges sont encore plus visibles */
    html[data-theme="dark"] .border.rounded-xl .badge,
    html[data-theme="dark"] .rounded-xl .badge.capitalize {
      border-width: 2px !important;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25) !important;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
    }
    
    /* Styles spécifiques par type de statut */
    html[data-theme="dark"] .border.rounded-xl .badge.bg-blue-100,
    html[data-theme="dark"] .rounded-xl .badge.bg-blue-100,
    html[data-theme="dark"] .border.rounded-xl .badge.dark\\:bg-blue-800\\/30 {
      background-color: rgba(37, 99, 235, 0.9) !important;
      color: white !important;
      border-color: #60a5fa !important;
    }
    
    html[data-theme="dark"] .border.rounded-xl .badge.bg-green-50,
    html[data-theme="dark"] .rounded-xl .badge.bg-green-50,
    html[data-theme="dark"] .border.rounded-xl .badge.dark\\:bg-green-800\\/30 {
      background-color: rgba(22, 163, 74, 0.9) !important;
      color: white !important;
      border-color: #4ade80 !important;
    }
    
    html[data-theme="dark"] .border.rounded-xl .badge.bg-yellow-50,
    html[data-theme="dark"] .rounded-xl .badge.bg-yellow-50,
    html[data-theme="dark"] .border.rounded-xl .badge.dark\\:bg-yellow-800\\/30 {
      background-color: rgba(202, 138, 4, 0.9) !important;
      color: white !important;
      border-color: #fcd34d !important;
    }
    
    /* 2. COMPTEURS EN HAUT À DROITE */
    /* Styles pour les compteurs dans les coins supérieurs */
    html[data-theme="dark"] span.text-xs.font-medium {
      font-weight: 700 !important;
      border-radius: 9999px !important;
      padding: 0.4rem 0.7rem !important;
      border: 2px solid !important;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25) !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4) !important;
      color: white !important;
      line-height: 1 !important;
    }
    
    /* Active Tasks */
    html[data-theme="dark"] span.text-xs.font-medium.bg-blue-500\\/10 {
      background-color: rgba(37, 99, 235, 0.9) !important;
      border-color: #60a5fa !important;
    }
    
    /* Completed Today */
    html[data-theme="dark"] span.text-xs.font-medium.bg-green-500\\/10 {
      background-color: rgba(22, 163, 74, 0.9) !important;
      border-color: #4ade80 !important;
    }
    
    /* CORRECTIFS SUPPLÉMENTAIRES POUR LES STATUTS DE SESSION */
    /* Noms des indicateurs de statut dans les sessions */
    html[data-theme="dark"] .border.rounded-xl .font-semibold.text-lg {
      color: white !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
    }
    
    /* Couleurs des statuts dans les sessions quand ils sont affichés en texte */
    html[data-theme="dark"] .text-blue-600.dark\\:text-blue-400,
    html[data-theme="dark"] .text-yellow-600.dark\\:text-yellow-400,
    html[data-theme="dark"] .text-gray-700.dark\\:text-gray-300 {
      font-weight: 700 !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
    }
  `;
  
  document.head.appendChild(styleElement);
};

// S'assurer que les styles sont injectés le plus tôt possible
if (typeof window !== 'undefined') {
  // Injecter immédiatement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCriticalStyles);
  } else {
    injectCriticalStyles();
  }
  
  // Injecter aussi après le chargement complet pour s'assurer que nos styles ont priorité
  window.addEventListener('load', () => {
    // Petit délai pour s'assurer que tous les autres styles sont chargés
    setTimeout(injectCriticalStyles, 100);
  });
  
  // Réinjecter périodiquement pour maintenir les styles (au cas où ils seraient écrasés)
  setInterval(injectCriticalStyles, 2000);
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
