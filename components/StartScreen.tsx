
import React from 'react';
import { PencilIcon, BookOpenIcon, NovaIcon } from './Icons';
import { LearningMode } from '../types';

const StartScreen: React.FC<{ onSelectMode: (mode: LearningMode) => void }> = ({ onSelectMode }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-sans bg-gradient-to-br from-slate-900 to-slate-700 text-white p-6">
      <div className="w-full max-w-md text-center">
        
        <div className="mb-12">
            <NovaIcon className="w-24 h-24 text-indigo-400 mx-auto" />
            <h1 className="text-4xl font-bold mt-4">Chào mừng đến với NOVA</h1>
            <p className="text-lg text-gray-300 mt-2">Trợ lý học tập AI của bạn.</p>
        </div>
        
        <h2 className="text-lg text-gray-300 mb-10">
          Bạn muốn bắt đầu như thế nào?
        </h2>

        <div className="flex flex-col gap-5">
          
          <button
            onClick={() => onSelectMode('solve_socratic')}
            className="group text-center p-6 bg-slate-800/50 rounded-xl transition-all duration-300 ease-in-out hover:bg-slate-800/80 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 border border-white/10"
            aria-label="Giải bài tập"
          >
            <PencilIcon className="w-10 h-10 text-indigo-400 mb-4 mx-auto" />
            <h3 className="text-lg font-bold text-gray-100 mb-2">Giải bài tập</h3>
            <p className="text-sm text-gray-400">Nhận hướng dẫn từng bước hoặc xem lời giải chi tiết.</p>
          </button>

          <button
            onClick={() => onSelectMode('review')}
            className="group text-center p-6 bg-slate-800/50 rounded-xl transition-all duration-300 ease-in-out hover:bg-slate-800/80 focus:outline-none focus:ring-4 focus:ring-teal-400 focus:ring-opacity-50 border border-white/10"
            aria-label="Ôn lại kiến thức"
          >
            <BookOpenIcon className="w-10 h-10 text-teal-400 mb-4 mx-auto" />
            <h3 className="text-lg font-bold text-gray-100 mb-2">Ôn lại kiến thức</h3>
            <p className="text-sm text-gray-400">Cùng xem lại các khái niệm, công thức và lý thuyết quan trọng.</p>
          </button>

        </div>
      </div>
    </div>
  );
};

export default StartScreen;
