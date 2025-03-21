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
import './styles/card-fixes.css';
import './styles/dark-mode-category-fixes.css'; // Ajout du nouveau fichier CSS

// Injecter un style critique pour assurer la visibilité des compteurs et statuts
const injectCriticalStyles = () => {
  const styleElement = document.createElement('style');
  styleElement.setAttribute('id', 'critical-status-counters-fix');
  styleElement.textContent = `
    /* CORRECTIFS INJECTÉS DIRECTEMENT POUR LES STATUTS ET COMPTEURS */
    
    /* ========== MODE SOMBRE - DARK MODE ========== */
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
    
    /* CORRECTIF CRITIQUE POUR LES COMPTEURS EN HAUT À DROITE (TOP CORNER COUNTERS) */
    /* Ces sélecteurs sont ultra-spécifiques pour cibler les compteurs dans la barre supérieure */
    html[data-theme="dark"] header .flex.items-center span.text-xs.font-medium,
    html[data-theme="dark"] nav .flex.items-center span.text-xs.font-medium,
    html[data-theme="dark"] div[class*="header"] .flex.items-center span.text-xs.font-medium,
    html[data-theme="dark"] div[class*="navbar"] .flex.items-center span.text-xs.font-medium,
    html[data-theme="dark"] div.flex.items-center.justify-end span.text-xs.font-medium {
      color: white !important;
      font-weight: 700 !important;
      padding: 5px 10px !important;
      border: 2px solid !important;
      border-radius: 9999px !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4) !important;
      margin: 0 4px !important;
      display: inline-flex !important;
      align-items: center !important;
      min-width: 28px !important;
      position: relative !important;
      z-index: 50 !important;
    }
    
    /* "Active Tasks" counter specifics */
    html[data-theme="dark"] header .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
    html[data-theme="dark"] nav .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
    html[data-theme="dark"] div[class*="header"] .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
    html[data-theme="dark"] div[class*="navbar"] .flex.items-center span.text-xs.font-medium.bg-blue-500\\/10,
    html[data-theme="dark"] div.flex.items-center.justify-end span.text-xs.font-medium.bg-blue-500\\/10 {
      background-color: rgba(37, 99, 235, 1) !important;
      border-color: #60a5fa !important;
    }
    
    /* "Completed Today" counter specifics */
    html[data-theme="dark"] header .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
    html[data-theme="dark"] nav .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
    html[data-theme="dark"] div[class*="header"] .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
    html[data-theme="dark"] div[class*="navbar"] .flex.items-center span.text-xs.font-medium.bg-green-500\\/10,
    html[data-theme="dark"] div.flex.items-center.justify-end span.text-xs.font-medium.bg-green-500\\/10 {
      background-color: rgba(22, 163, 74, 1) !important;
      border-color: #4ade80 !important;
    }
    
    /* Amélioration de la visibilité des textes à côté des compteurs */
    html[data-theme="dark"] header .flex.items-center span:not(.text-xs.font-medium),
    html[data-theme="dark"] nav .flex.items-center span:not(.text-xs.font-medium),
    html[data-theme="dark"] div[class*="header"] .flex.items-center span:not(.text-xs.font-medium),
    html[data-theme="dark"] div[class*="navbar"] .flex.items-center span:not(.text-xs.font-medium),
    html[data-theme="dark"] div.flex.items-center.justify-end span:not(.text-xs.font-medium) {
      color: #e2e8f0 !important;
      font-weight: 600 !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4) !important;
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
    
    /* Sélecteurs universels pour les compteurs d'activité */
    html[data-theme="dark"] span.text-xs.font-medium.bg-blue-500\\/10,
    html[data-theme="dark"] span.text-xs.font-medium.bg-green-500\\/10 {
      color: white !important;
      border: 2px solid !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 4px 8px !important;
      border-radius: 9999px !important;
      font-weight: 700 !important;
      min-width: 24px !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
    }
    
    html[data-theme="dark"] span.text-xs.font-medium.bg-blue-500\\/10 {
      background-color: rgba(37, 99, 235, 1) !important;
      border-color: #60a5fa !important;
    }
    
    html[data-theme="dark"] span.text-xs.font-medium.bg-green-500\\/10 {
      background-color: rgba(22, 163, 74, 1) !important;
      border-color: #4ade80 !important;
    }
    
    /* ========== MODE CLAIR - LIGHT MODE ========== */
    /* Styles pour les badges de catégorie */
    html[data-theme="light"] .category-badge,
    .light .category-badge {
      background-color: rgba(59, 130, 246, 0.15) !important;
      color: rgb(30, 64, 175) !important;
      border: 2px solid rgba(59, 130, 246, 0.5) !important;
      font-weight: 700 !important;
      padding: 0.35rem 0.75rem !important;
      visibility: visible !important;
      opacity: 1 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 9999px !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
    }
    
    /* Status badges in light mode */
    html[data-theme="light"] .badge.capitalize.font-medium {
      font-weight: 700 !important;
      padding: 4px 10px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      border-width: 2px !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
    }
    
    /* In Progress, On Hold, Completed avec fonds contrastés en mode clair */
    html[data-theme="light"] .badge:contains("In Progress") {
      background-color: rgba(59, 130, 246, 0.15) !important;
      color: rgb(30, 64, 175) !important;
      border-color: rgba(59, 130, 246, 0.5) !important;
    }
    
    html[data-theme="light"] .badge:contains("On Hold") {
      background-color: rgba(245, 158, 11, 0.15) !important;
      color: rgb(180, 83, 9) !important;
      border-color: rgba(245, 158, 11, 0.5) !important;
    }
    
    html[data-theme="light"] .badge:contains("Completed") {
      background-color: rgba(34, 197, 94, 0.15) !important;
      color: rgb(22, 101, 52) !important;
      border-color: rgba(34, 197, 94, 0.5) !important;
    }
    
    /* Correction pour les sélecteurs de catégories en mode clair */
    html[data-theme="light"] [class*="SelectTrigger"],
    .light [class*="SelectTrigger"] {
      background-color: white !important;
      border-color: rgba(203, 213, 225, 0.8) !important;
      color: rgb(15, 23, 42) !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
    }
    
    html[data-theme="light"] [class*="SelectTrigger"]:hover,
    .light [class*="SelectTrigger"]:hover {
      border-color: rgba(59, 130, 246, 0.5) !important;
    }
    
    html[data-theme="light"] [class*="SelectContent"],
    .light [class*="SelectContent"] {
      background-color: white !important;
      border-color: rgba(203, 213, 225, 0.8) !important;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1) !important;
    }
  `;
  
  document.head.appendChild(styleElement);
  
  // Ajouter un script pour forcer le rendu des compteurs
  setTimeout(() => {
    const counters = document.querySelectorAll('.text-xs.font-medium.bg-blue-500\\/10, .text-xs.font-medium.bg-green-500\\/10');
    counters.forEach(counter => {
      // Forcer un re-rendu en modifiant légèrement le DOM
      const parent = counter.parentElement;
      if (parent) {
        const clone = counter.cloneNode(true);
        parent.replaceChild(clone, counter);
      }
    });
  }, 500);
};

// S'assurer que les styles sont injectés au chargement de la page
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', injectCriticalStyles);
  // Aussi injecter immédiatement au cas où le DOM est déjà chargé
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    injectCriticalStyles();
  }
  
  // Réinjecter les styles après un délai pour s'assurer qu'ils ne sont pas écrasés
  setTimeout(injectCriticalStyles, 1000);
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
