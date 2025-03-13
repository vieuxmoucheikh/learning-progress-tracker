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
import './styles/mobile-card-light-mode-fixes.css'
import '../public/emergency-light-card-fix.css'

// Fonction pour corriger les cartes d'apprentissage après le rendu React
const fixLearningCards = () => {
  if (window.innerWidth <= 768) {
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                        !document.documentElement.classList.contains('dark');
    
    if (isLightMode) {
      document.querySelectorAll('.learning-item-card, [class*="learning-item-card"], [class*="learning-card"]').forEach(card => {
        // @ts-ignore
        card.style.backgroundColor = "#ffffff";
        // @ts-ignore
        card.style.border = "2px solid #d1d5db";
        // @ts-ignore
        card.style.color = "#1f2937";
        
        // @ts-ignore
        card.querySelectorAll('h3, [class*="title"]').forEach(el => {
          // @ts-ignore
          el.style.color = "#000000";
          // @ts-ignore
          el.style.fontWeight = "bold";
        });
        
        // @ts-ignore
        card.querySelectorAll('p, [class*="text"], [class*="description"]').forEach(el => {
          // @ts-ignore
          el.style.color = "#111827";
          // @ts-ignore
          el.style.opacity = "1";
        });
      });
    }
  }
};

function Root() {
  React.useEffect(() => {
    // Appliquer les correctifs après le rendu
    fixLearningCards();
    
    // Appliquer après un court délai
    const timeout = setTimeout(fixLearningCards, 500);
    
    // Observer les changements de taille ou de thème
    const resizeListener = () => fixLearningCards();
    window.addEventListener('resize', resizeListener);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', resizeListener);
    };
  }, []);

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
