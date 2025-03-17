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

// Version simplifiée sans setTimeout pour éviter les problèmes d'initialisation
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
    
    document.documentElement.style.colorScheme = shouldUseDarkMode ? 'dark' : 'light';
  } catch (e) {
    console.error('Error initializing theme:', e);
  }
};

// Exécuter immédiatement - aucun délai
initializeTheme();

const rootElement = document.getElementById('root');

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

  try {
    ReactDOM.createRoot(rootElement).render(
      <Root />
    );
  } catch (error) {
    console.error('Rendering error:', error);
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
