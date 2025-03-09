 const LearningCardsPage: React.FC = () => {
  // Add explicit text colors to ensure visibility in dark mode
  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Learning Cards</h1>
      
      {/* Rest of the component with explicit text colors */}
      <div className="text-gray-900 dark:text-white">
        {/* Your existing content */}
      </div>
    </div>
  );
};

export default LearningCardsPage;
