
import React from 'react';
import { EducationalStage, DifficultyLevel } from '../types';

interface LevelSelectorProps {
  selectedStage: EducationalStage;
  setSelectedStage: (stage: EducationalStage) => void;
  selectedDifficulty: DifficultyLevel;
  setSelectedDifficulty: (difficulty: DifficultyLevel) => void;
  isLoading: boolean;
}

const SelectArrow: React.FC = () => (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-400">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
    </div>
);

const LevelSelector: React.FC<LevelSelectorProps> = ({
  selectedStage,
  setSelectedStage,
  selectedDifficulty,
  setSelectedDifficulty,
  isLoading
}) => {
  const selectClasses = "appearance-none block w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 py-2 px-3 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 text-sm transition-colors";

  return (
    <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative">
            <select
                id="stage-select"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value as EducationalStage)}
                disabled={isLoading}
                className={selectClasses}
                aria-label="Chọn trình độ"
            >
                {Object.values(EducationalStage).map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                ))}
            </select>
            <SelectArrow />
        </div>
        <div className="relative">
            <select
                id="difficulty-select"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as DifficultyLevel)}
                disabled={isLoading}
                className={selectClasses}
                aria-label="Chọn mức độ"
            >
                {Object.values(DifficultyLevel).map((difficulty) => (
                    <option key={difficulty} value={difficulty}>{difficulty}</option>
                ))}
            </select>
            <SelectArrow />
        </div>
    </div>
  );
};

export default LevelSelector;