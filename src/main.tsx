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
import '../public/final-light-mode-fix.css' // Correctif supplémentaire
import '../public/unified-mobile-light-mode.css' // Style unifié pour mobile
import '../public/critical-mobile-dark-light.css' // Correctifs de priorité absolue

// Fonction pour corriger les cartes d'apprentissage après le rendu React
const fixLearningCards = () => {
  if (window.innerWidth <= 768) {
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                        !document.documentElement.classList.contains('dark');
    
    if (isLightMode) {
      document.querySelectorAll('.learning-item-card, [class*="learning-item-card"], [class*="learning-card"], .card, [class*="card"]').forEach(card => {
        // @ts-ignore - Style de base
        card.style.backgroundColor = "#ffffff";
        // @ts-ignore
        card.style.border = "2px solid #94a3b8"; // Bordure plus visible slate-400
        // @ts-ignore
        card.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
        // @ts-ignore
        card.style.color = "#000000"; // Noir pur pour contraste maximal
        
        // @ts-ignore - Titres
        card.querySelectorAll('h3, h4, [class*="title"], [class*="heading"]').forEach(el => {
          // @ts-ignore
          el.style.color = "#000000";
          // @ts-ignore
          el.style.fontWeight = "700";
          // @ts-ignore
          el.style.opacity = "1";
          // @ts-ignore
          el.style.visibility = "visible";
        });
        
        // @ts-ignore - Textes
        card.querySelectorAll('p, [class*="text"], [class*="description"]').forEach(el => {
          // @ts-ignore
          el.style.color = "#000000";
          // @ts-ignore
          el.style.opacity = "1";
          // @ts-ignore
          el.style.fontWeight = "500";
        });
        
        // @ts-ignore - Icônes
        card.querySelectorAll('svg, [class*="icon"]').forEach(el => {
          // @ts-ignore
          el.style.color = "#000000";
          // @ts-ignore
          el.style.stroke = "#000000";
          // @ts-ignore
          el.style.strokeWidth = "2.5px";
          // @ts-ignore
          el.style.fill = "none";
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
    const timeout1 = setTimeout(fixLearningCards, 100);
    const timeout2 = setTimeout(fixLearningCards, 500);
    const timeout3 = setTimeout(fixLearningCards, 1500);
    
    // Observer les changements de taille ou de thème
    const resizeListener = () => fixLearningCards();
    window.addEventListener('resize', resizeListener);
    
    // Observer les changements de thème
    const themeObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class') {
          fixLearningCards();
        }
      }
    });
    
    themeObserver.observe(document.documentElement, { attributes: true });
    
    // Observer les changements de DOM pour le contenu dynamique
    const contentObserver = new MutationObserver(() => {
      if (window.innerWidth <= 768) {
        fixLearningCards();
      }
    });
    
    contentObserver.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      window.removeEventListener('resize', resizeListener);
      themeObserver.disconnect();
      contentObserver.disconnect();
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
