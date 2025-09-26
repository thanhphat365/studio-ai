import React from 'react';
import { EducationalStage, DifficultyLevel } from '../types';

interface LevelSelectorProps {
  selectedStage: EducationalStage;
  setSelectedStage: (stage: EducationalStage) => void;
  selectedDifficulty: DifficultyLevel;
  setSelectedDifficulty: (difficulty: DifficultyLevel) => void;
  isLoading: boolean;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({
  selectedStage,
  setSelectedStage,
  selectedDifficulty,
  setSelectedDifficulty,
  isLoading
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
      {/* Educational Stage Selector */}
      <div className="flex items-center space-x-2 p-1.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full">
        <span className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 pl-2 hidden sm:inline">Trình độ:</span>
        {Object.values(EducationalStage).map((stage) => (
          <button
            key={stage}
            onClick={() => setSelectedStage(stage)}
            disabled={isLoading}
            className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-indigo-500 ${
              selectedStage === stage
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {stage}
          </button>
        ))}
      </div>
      {/* Difficulty Level Selector */}
      <div className="flex items-center space-x-2 p-1.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full">
         <span className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 pl-2 hidden sm:inline">Mức độ:</span>
        {Object.values(DifficultyLevel).map((difficulty) => (
          <button
            key={difficulty}
            onClick={() => setSelectedDifficulty(difficulty)}
            disabled={isLoading}
            className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-indigo-500 ${
              selectedDifficulty === difficulty
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {difficulty}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LevelSelector;