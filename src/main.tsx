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
import './styles/critical-light-mode-fixes.css'
import '../public/emergency-mobile-fix.css'
import './styles/mobile-performance-fix.css' // Ajout du correctif de performance

// Version simplifiée synchrone (éviter les délais)
const initializeTheme = () => {
  try {
    const storedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDarkMode = storedTheme === 'dark' || (!storedTheme && systemPrefersDark);
    
    if (shouldUseDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Configurer immédiatement sans animation pour éviter les ralentissements
    document.documentElement.classList.add('disable-transitions');
    document.documentElement.style.colorScheme = shouldUseDarkMode ? 'dark' : 'light';
    
    // Réactiver les transitions après un court délai
    setTimeout(() => {
      document.documentElement.classList.remove('disable-transitions');
    }, 300);
  } catch (e) {
    console.error('Error initializing theme:', e);
  }
};

// Initialisation de l'optimisation de défilement pour mobile
const initializeScrollPerformance = () => {
  // Détection mobile
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Ajouter une classe spéciale pour cibler les optimisations mobile
    document.documentElement.classList.add('mobile-device');
    
    // Configurer les attributs de viewport pour un défilement optimal
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    }
    
    // Empêcher les rebonds de page sur iOS (qui peuvent causer des problèmes de défilement)
    document.body.style.overscrollBehavior = 'none';
    
    // Optimiser spécifiquement pour Safari iOS
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      document.documentElement.style.webkitOverflowScrolling = 'touch';
    }
  }
};

// Exécution immédiate des initialisations
initializeTheme();
initializeScrollPerformance();

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
