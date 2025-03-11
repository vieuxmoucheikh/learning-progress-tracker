import React, { useEffect } from 'react';

export function DashboardIconStyles() {
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      :root {
        --calendar-icon-color: #3b82f6;
        --calendar-icon-stroke: #3b82f6;
        --clock-icon-color: #3b82f6;
        --clock-icon-stroke: #3b82f6;
        --check-icon-color: #10b981;
        --check-icon-stroke: #10b981;
        --book-icon-color: #8b5cf6;
        --book-icon-stroke: #8b5cf6;
        --trophy-icon-color: #f59e0b;
        --trophy-icon-stroke: #f59e0b;
        --target-icon-color: #10b981;
        --target-icon-stroke: #10b981;
      }
      
      .dark {
        --calendar-icon-color: #60a5fa;
        --calendar-icon-stroke: #60a5fa;
        --clock-icon-color: #60a5fa;
        --clock-icon-stroke: #60a5fa;
        --check-icon-color: #34d399;
        --check-icon-stroke: #34d399;
        --book-icon-color: #a78bfa;
        --book-icon-stroke: #a78bfa;
        --trophy-icon-color: #fbbf24;
        --trophy-icon-stroke: #fbbf24;
        --target-icon-color: #34d399;
        --target-icon-stroke: #34d399;
      }
      
      /* Styles directs pour les icônes dans les cercles colorés */
      .dark .bg-blue-100 svg {
        color: #60a5fa !important;
        stroke: #60a5fa !important;
        fill: none !important;
      }
      
      .dark .bg-green-100 svg {
        color: #34d399 !important;
        stroke: #34d399 !important;
        fill: none !important;
      }
      
      .dark .bg-purple-100 svg {
        color: #a78bfa !important;
        stroke: #a78bfa !important;
        fill: none !important;
      }
      
      .dark .bg-amber-100 svg {
        color: #fbbf24 !important;
        stroke: #fbbf24 !important;
        fill: none !important;
      }
      
      /* Styles pour les backgrounds en mode sombre */
      .dark .bg-blue-100 {
        background-color: rgba(30, 58, 138, 0.8) !important;
      }
      
      .dark .bg-green-100 {
        background-color: rgba(6, 78, 59, 0.8) !important;
      }
      
      .dark .bg-purple-100 {
        background-color: rgba(76, 29, 149, 0.8) !important;
      }
      
      .dark .bg-amber-100 {
        background-color: rgba(120, 53, 15, 0.8) !important;
      }
      
      /* Force les icônes sans remplissage */
      .dark svg {
        fill: none !important;
        stroke-width: 2 !important;
      }
      
      .dark svg path {
        fill: none !important;
        stroke: inherit !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return null;
}
