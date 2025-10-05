import React, { useState, useEffect, useRef } from 'react';
import LevelSelector from './LevelSelector';
import ModeSelector from './ModeSelector';
import { NovaIcon, UserIcon, PaintBrushIcon } from './Icons';
import { EducationalStage, DifficultyLevel, ThemePalette, User, LearningMode } from '../types';

interface HeaderProps {
  themePalette: ThemePalette;
  setThemePalette: (theme: ThemePalette) => void;
  onOpenCustomTheme: () => void;
  learningMode: LearningMode;
  setLearningMode: (mode: LearningMode) => void;
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

const themes: { id: ThemePalette; name: string; color: string }[] = [
    { id: 'default', name: 'Mặc định', color: 'bg-slate-500' },
    { id: 'mint', name: 'Xanh bạc hà', color: 'bg-emerald-500' },
    { id: 'twilight', name: 'Chạng vạng', color: 'bg-indigo-500' },
    { id: 'sepia', name: 'Giấy cũ', color: 'bg-yellow-700' },
];

const ThemeSelector: React.FC<{
    currentTheme: ThemePalette;
    setTheme: (theme: ThemePalette) => void;
    onOpenCustom: () => void;
}> = ({ currentTheme, setTheme, onOpenCustom }) => {
    const [isOpen, setIsOpen] = useState(false);
    const themeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={themeRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-card-secondary transition-colors"
                aria-label="Chọn giao diện"
            >
                <PaintBrushIcon className="w-6 h-6 text-text-primary" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-30 border border-border">
                    <p className="px-3 py-2 text-sm font-semibold text-text-primary">Giao diện</p>
                    {themes.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => {
                                setTheme(theme.id);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm  hover:bg-card-secondary ${currentTheme === theme.id && currentTheme !== 'custom' ? 'text-primary' : 'text-text-primary'}`}
                        >
                            <span className={`w-4 h-4 rounded-full ${theme.color} ring-1 ring-offset-2 ring-offset-card ring-border`}></span>
                            {theme.name}
                        </button>
                    ))}
                    <div className="my-1 h-px bg-border" />
                    <button
                        onClick={() => {
                            onOpenCustom();
                            setIsOpen(false);
                        }}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-card-secondary ${currentTheme === 'custom' ? 'text-primary' : 'text-text-primary'}`}
                    >
                         <span className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 ring-1 ring-offset-2 ring-offset-card ring-border"></span>
                         Tùy chỉnh...
                    </button>
                </div>
            )}
        </div>
    );
};
    
const Header: React.FC<HeaderProps> = ({
  themePalette,
  setThemePalette,
  onOpenCustomTheme,
  learningMode,
  setLearningMode,
  selectedStage,
  setSelectedStage,
  selectedDifficulty,
  // FIX: Ensured 'setSelectedDifficulty' prop is destructured correctly to prevent 'Cannot find name' error.
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
    
  const UserProfile = () => (
    <div className="relative" ref={profileRef}>
      <button 
        onClick={() => setIsProfileOpen(!isProfileOpen)}
        className="w-10 h-10 rounded-full bg-card-secondary flex items-center justify-center text-primary font-bold text-lg"
      >
        {currentUser?.username.charAt(0).toUpperCase()}
      </button>
      {isProfileOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-card rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-30 border border-border">
          <div className="px-4 py-2 text-sm text-text-primary border-b border-border">
            <p className="font-semibold">Đăng nhập với tên</p>
            <p className="truncate">{currentUser?.username}</p>
          </div>
           <button
            onClick={() => {
              onClearHistory();
              setIsProfileOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-card-secondary"
          >
            Xóa lịch sử trò chuyện
          </button>
          <button
            onClick={() => {
              onLogout();
              setIsProfileOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-card-secondary"
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );

  return (
    <header className="flex justify-between items-center w-full p-2 sm:p-4 shadow-sm bg-card/80 backdrop-blur-md sticky top-0 z-20 border-b border-border">
        <div className="flex-1 flex justify-start">
            <a href="/" aria-label="Trang chủ NOVA" className="flex items-center gap-3" onClick={onHomeClick}>
                <NovaIcon className="w-8 h-8 text-text-primary" />
                <span className="text-xl font-bold text-text-primary hidden sm:block">NOVA</span>
            </a>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 sm:gap-4">
            <ModeSelector 
              learningMode={learningMode}
              setLearningMode={setLearningMode}
              isLoading={isLoading}
            />
            <LevelSelector 
                selectedStage={selectedStage} 
                setSelectedStage={setSelectedStage}
                selectedDifficulty={selectedDifficulty}
                setSelectedDifficulty={setSelectedDifficulty}
                isLoading={isLoading} 
            />
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
            <ThemeSelector currentTheme={themePalette} setTheme={setThemePalette} onOpenCustom={onOpenCustomTheme} />
            {currentUser ? (
              <UserProfile />
            ) : (
              <button 
                onClick={onLoginClick}
                className="px-4 py-2 text-sm font-semibold bg-primary text-primary-text rounded-lg hover:bg-primary-hover transition-colors"
              >
                Đăng nhập
              </button>
            )}
        </div>
    </header>
  );
};

export default Header;
