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

// Ajout d'une fonction pour égaliser les hauteurs des widgets sur le dashboard
const equalizeWidgetHeights = () => {
  if (window.innerWidth < 768) return; // N'appliquer que sur desktop
  
  // Identifier les éléments potentiels
  const findElements = (selectors) => {
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) return Array.from(elements);
    }
    return [];
  };
  
  // Sélecteurs potentiels pour le widget calendrier
  const calendarSelectors = [
    '[class*="calendar-widget"]', 
    '[class*="Calendar"]',
    '.rdp-month',
    '[class*="calendar"]',
    'div:has(> .rdp)'
  ];
  
  // Sélecteurs potentiels pour le widget des tâches actives
  const activeTasksSelectors = [
    '.active-tasks-widget',
    '[class*="active-tasks"]',
    'div:has(> h2:contains("Active Tasks"))',
    'div:has(> h3:contains("Active Tasks"))',
    'div:has(> div > h2:contains("Active Tasks"))',
    '[class*="card"]:has(h2:contains("Active Tasks"))'
  ];
  
  setTimeout(() => {
    const calendarElements = findElements(calendarSelectors);
    const activeTasksElements = findElements(activeTasksSelectors);
    
    if (calendarElements.length > 0 && activeTasksElements.length > 0) {
      // Trouver le calendrier et le widget des tâches actives
      const calendarWidget = calendarElements[0];
      const activeTasksWidget = activeTasksElements[0];
      
      // Obtenir la hauteur du calendrier
      const calendarHeight = calendarWidget.offsetHeight;
      
      if (calendarHeight > 0) {
        // Appliquer la même hauteur au widget des tâches actives
        activeTasksWidget.style.height = `${calendarHeight}px`;
        activeTasksWidget.style.display = 'flex';
        activeTasksWidget.style.flexDirection = 'column';
        
        // Trouver la liste de tâches à l'intérieur du widget et lui donner un défilement
        const tasksList = activeTasksWidget.querySelector('[class*="grid"], [class*="list"]');
        if (tasksList) {
          tasksList.style.flex = '1';
          tasksList.style.overflowY = 'auto';
          tasksList.style.maxHeight = 'calc(100% - 50px)';
        }
      }
    }
  }, 500); // Délai pour s'assurer que les éléments sont rendus
};

// S'assurer que les styles sont injectés et que les hauteurs sont égalisées
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    injectCriticalStyles();
    equalizeWidgetHeights();
  });
  
  // Aussi appliquer au redimensionnement
  window.addEventListener('resize', equalizeWidgetHeights);
  
  // Également injecter immédiatement au cas où le DOM est déjà chargé
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    injectCriticalStyles();
    equalizeWidgetHeights();
  }
  
  // Réinjecter les styles et égaliser les hauteurs après un délai
  setTimeout(() => {
    injectCriticalStyles();
    equalizeWidgetHeights();
  }, 1000);
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
