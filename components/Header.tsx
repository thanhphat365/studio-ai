import React from 'react';
import LevelSelector from './LevelSelector';
import { SunIcon, MoonIcon, NovaIcon } from './Icons';
import { EducationalStage, DifficultyLevel, Theme } from '../types';

interface HeaderProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  selectedStage: EducationalStage;
  setSelectedStage: (stage: EducationalStage) => void;
  selectedDifficulty: DifficultyLevel;
  setSelectedDifficulty: (difficulty: DifficultyLevel) => void;
  isLoading: boolean;
}

const Header: React.FC<HeaderProps> = ({
  theme,
  setTheme,
  selectedStage,
  setSelectedStage,
  selectedDifficulty,
  setSelectedDifficulty,
  isLoading,
}) => {

  const ThemeToggleButton = () => {
    const nextTheme: Record<Theme, Theme> = {
        light: 'dark',
        dark: 'system',
        system: 'light',
    };

    return (
        <button
            onClick={() => setTheme(nextTheme[theme])}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={`Switch to ${nextTheme[theme]} mode`}
        >
            <SunIcon className="w-6 h-6 text-gray-700 dark:text-gray-300 hidden [.dark_&]:hidden [html:not(.dark)_&]:block" />
            <MoonIcon className="w-6 h-6 text-gray-700 dark:text-gray-300 hidden [.dark_&]:block" />
        </button>
    );
  };
    
  return (
    <header className="flex flex-col md:flex-row justify-center items-center gap-4 p-4 shadow-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1 flex justify-start items-center gap-3">
          <a href="/" aria-label="Trang chủ NOVA" className="flex items-center gap-3">
              <NovaIcon className="w-8 h-8 text-gray-800 dark:text-gray-200" />
          </a>
        </div>
        <LevelSelector 
            selectedStage={selectedStage} 
            setSelectedStage={setSelectedStage}
            selectedDifficulty={selectedDifficulty}
            setSelectedDifficulty={setSelectedDifficulty}
            isLoading={isLoading} 
        />
        <div className="flex-1 flex justify-end">
            <ThemeToggleButton />
        </div>
    </header>
  );
};

export default Header;