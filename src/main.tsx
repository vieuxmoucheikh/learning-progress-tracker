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

// Fonction d'initialisation de thème optimisée et non bloquante
const initializeTheme = () => {
  try {
    // Utiliser setTimeout pour déplacer ce code hors du chemin critique de rendu
    setTimeout(() => {
      const storedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldUseDarkMode = storedTheme === 'dark' || (!storedTheme && systemPrefersDark);
      
      if (shouldUseDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      document.documentElement.style.colorScheme = shouldUseDarkMode ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', shouldUseDarkMode ? 'dark' : 'light');
      document.documentElement.classList.add('theme-transitions-enabled');
    }, 0);
  } catch (e) {
    // Ignorer les erreurs pour éviter que l'application ne se bloque
    console.error('Error initializing theme:', e);
  }
};

// Exécuter de manière non bloquante
initializeTheme();

// Récupérer l'élément racine en dehors du composant
const rootElement = document.getElementById('root');

// Vérifier que l'élément racine existe
if (!rootElement) {
  console.error('Root element not found');
} else {
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

  // Utiliser une fonction anonyme pour le rendu avec gestion d'erreur
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <Root />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Rendering error:', error);
    // Afficher un message d'erreur basique en cas d'échec du rendu
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h2>Erreur de chargement</h2>
        <p>L'application n'a pas pu démarrer correctement.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; margin-top: 20px;">
          Réessayer
        </button>
      </div>
    `;
  }
}
