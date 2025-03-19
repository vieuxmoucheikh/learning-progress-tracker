import React, { useMemo } from 'react';

interface YearlyActivityHeatmapProps {
  data: Record<string, number>;
  year?: number;
  colorMode?: 'light' | 'dark' | 'auto';
}

export const YearlyActivityHeatmap: React.FC<YearlyActivityHeatmapProps> = ({
  data,
  year = new Date().getFullYear(),
  colorMode = 'auto'
}) => {
  // Liste des mois abrégés
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Liste des jours de la semaine
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Niveaux d'activité pour le texte de l'infobulle
  const activityLabels = [
    "Aucune activité",
    "Faible activité",
    "Activité moyenne",
    "Activité élevée",
    "Activité très élevée"
  ];

  // Couleurs améliorées pour une meilleure visibilité en mode clair
  const colorLevels = [
    "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700", // niveau 0 (aucune activité)
    "bg-green-200 dark:bg-green-900 border border-green-300 dark:border-green-800", // niveau 1 (faible activité)
    "bg-green-400 dark:bg-green-700 border border-green-500 dark:border-green-600", // niveau 2 (activité moyenne)
    "bg-green-600 dark:bg-green-500 border border-green-700 dark:border-green-400 text-white", // niveau 3 (activité élevée)
    "bg-green-800 dark:bg-green-300 border border-green-900 dark:border-green-200 text-white dark:text-gray-800", // niveau 4 (activité très élevée)
  ];

  // Calculer les jours de l'année
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    
    // Trouver le premier dimanche pour commencer la grille
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    // Trouver le dernier samedi pour terminer la grille
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const calendar = [];
    let currentDate = new Date(startDate);
    
    // Parcourir toutes les semaines
    while (currentDate <= endDate) {
      const week = [];
      
      // Parcourir les jours de la semaine (0-6)
      for (let i = 0; i < 7; i++) {
        if (i < currentDate.getDay()) {
          week.push(null); // Remplir les jours vides au début
        } else {
          const dateStr = currentDate.toISOString().split('T')[0];
          const count = data[dateStr] || 0;
          
          // Déterminer le niveau d'activité (0-4)
          let level = 0;
          if (count > 0) level = 1;
          if (count >= 3) level = 2;
          if (count >= 5) level = 3;
          if (count >= 10) level = 4;
          
          week.push({
            date: dateStr,
            dayOfMonth: currentDate.getDate(),
            month: currentDate.getMonth(),
            count,
            level,
            inCurrentYear: currentDate.getFullYear() === year
          });
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      calendar.push(week);
    }
    
    return calendar;
  }, [data, year]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Activité d'apprentissage sur l'année {year}
      </div>
      
      <div className="overflow-x-auto pb-4">
        <div className="min-w-max">
          <div className="flex">
            {/* Mois labels */}
            <div className="w-10"></div> {/* Espace pour aligner avec les jours de la semaine */}
            <div className="flex flex-1">
              {months.map((month, i) => (
                <div key={month} className="flex-1 text-xs text-center text-gray-600 dark:text-gray-400 font-medium py-1">
                  {month}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex">
            {/* Jours de la semaine */}
            <div className="w-10 pr-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="h-6 md:h-7 flex items-center justify-end text-xs text-gray-600 dark:text-gray-400"
                >
                  {day.charAt(0)}
                </div>
              ))}
            </div>
            
            {/* Grille du calendrier */}
            <div className="flex-1 grid grid-cols-52 gap-1">
              {Array.from({ length: 52 }).map((_, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {weekDays.map((_, dayIdx) => {
                    const week = calendarData[weekIdx];
                    const day = week ? week[dayIdx] : null;
                    
                    if (!day) return <div key={dayIdx} className="w-5 h-5 md:w-6 md:h-6"></div>;
                    
                    return (
                      <div key={dayIdx} className="relative group">
                        <div
                          className={`
                            w-5 h-5 md:w-6 md:h-6 
                            ${colorLevels[day.level]} 
                            rounded-sm
                            transition-all duration-200
                            hover:scale-110
                            ${!day.inCurrentYear ? 'opacity-50' : ''}
                            shadow-sm
                          `}
                          title={`${day.date}: ${day.count} activités`}
                        ></div>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-20 shadow-md">
                          {day.date}: {day.count} activités ({activityLabels[day.level]})
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Légende */}
      <div className="flex items-center gap-2 justify-center text-sm text-gray-600 dark:text-gray-400">
        <span>Moins</span>
        {colorLevels.map((color, i) => (
          <div 
            key={i}
            className={`w-4 h-4 ${color} rounded-sm shadow-sm`}
            title={activityLabels[i]}
          ></div>
        ))}
        <span>Plus</span>
      </div>
    </div>
  );
};
