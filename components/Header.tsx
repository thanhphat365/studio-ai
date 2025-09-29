import React, { useState, useEffect, useRef } from 'react';
import LevelSelector from './LevelSelector';
import { SunIcon, MoonIcon, NovaIcon, UserIcon } from './Icons';
import { EducationalStage, DifficultyLevel, Theme, User } from '../types';

interface HeaderProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  selectedStage: EducationalStage;
  setSelectedStage: (stage: EducationalStage) => void;
  selectedDifficulty: DifficultyLevel;
  setSelectedDifficulty: (difficulty: DifficultyLevel) => void;
  isLoading: boolean;
  currentUser: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onHomeClick: (e: React.MouseEvent) => void;
  onClearHistory: () => void;
}

const Header: React.FC<HeaderProps> = ({
  theme,
  setTheme,
  selectedStage,
  setSelectedStage,
  selectedDifficulty,
  setSelectedDifficulty,
  isLoading,
  currentUser,
  onLoginClick,
  onLogout,
  onHomeClick,
  onClearHistory,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


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
    
  const UserProfile = () => (
    <div className="relative" ref={profileRef}>
      <button 
        onClick={() => setIsProfileOpen(!isProfileOpen)}
        className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg"
      >
        {currentUser?.username.charAt(0).toUpperCase()}
      </button>
      {isProfileOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-30">
          <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-slate-200 dark:border-slate-700">
            <p className="font-semibold">Đăng nhập với tên</p>
            <p className="truncate">{currentUser?.username}</p>
          </div>
           <button
            onClick={() => {
              onClearHistory();
              setIsProfileOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Xóa lịch sử trò chuyện
          </button>
          <button
            onClick={() => {
              onLogout();
              setIsProfileOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );

  return (
    <header className="flex justify-between items-center w-full p-4 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200 dark:border-slate-700">
        <div className="flex-1 flex justify-start">
            <a href="/" aria-label="Trang chủ NOVA" className="flex items-center gap-3" onClick={onHomeClick}>
                <NovaIcon className="w-8 h-8 text-gray-800 dark:text-gray-200" />
                <span className="text-xl font-bold text-gray-800 dark:text-gray-200 hidden sm:block">NOVA</span>
            </a>
        </div>
        <div className="flex-shrink-0">
            <LevelSelector 
                selectedStage={selectedStage} 
                setSelectedStage={setSelectedStage}
                selectedDifficulty={selectedDifficulty}
                setSelectedDifficulty={setSelectedDifficulty}
                isLoading={isLoading} 
            />
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
            <ThemeToggleButton />
            {currentUser ? (
              <UserProfile />
            ) : (
              <button 
                onClick={onLoginClick}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Đăng nhập
              </button>
            )}
        </div>
    </header>
  );
};

export default Header;