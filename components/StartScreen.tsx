import React from 'react';
import { BrainCircuitIcon, PencilIcon, BookOpenIcon } from './Icons';
import { LearningMode } from '../types';

const StartScreen: React.FC<{ onSelectMode: (mode: LearningMode) => void }> = ({ onSelectMode }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-gray-900 dark:text-gray-100 font-sans">
      <div className="text-center p-8 max-w-4xl mx-auto">
        <div className="flex justify-center mb-6">
            <div className="bg-white/50 dark:bg-gray-800/50 p-6 sm:p-8 rounded-full shadow-lg backdrop-blur-md">
                <BrainCircuitIcon className="w-16 h-16 sm:w-24 sm:h-24 text-indigo-500" />
            </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          Xin chào!
        </h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-10">
          Bạn muốn bắt đầu như thế nào?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <button
            onClick={() => onSelectMode('solve')}
            className="group flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50"
            aria-label="Giải bài tập"
          >
            <PencilIcon className="w-12 h-12 text-indigo-500 mb-4 transition-transform duration-300 group-hover:scale-110" />
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Giải bài tập</h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Tải lên bài tập hoặc câu hỏi để được hướng dẫn giải chi tiết.</p>
          </button>
          <button
            onClick={() => onSelectMode('review')}
            className="group flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-teal-500 focus:ring-opacity-50"
            aria-label="Ôn lại kiến thức"
          >
            <BookOpenIcon className="w-12 h-12 text-teal-500 mb-4 transition-transform duration-300 group-hover:scale-110" />
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Ôn lại kiến thức</h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Cùng xem lại các khái niệm, công thức và lý thuyết quan trọng.</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;