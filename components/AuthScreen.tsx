import React from 'react';
import { NovaIcon } from './Icons';

interface AuthScreenProps {
    onLoginClick: () => void;
    onGuestContinue: () => void;
    onChangelogClick: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginClick, onGuestContinue, onChangelogClick }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen font-sans bg-nova-dark text-white p-6">
      <div className="w-full max-w-md text-center">
        
        <div className="mb-12">
            <NovaIcon className="w-24 h-24 text-indigo-400 mx-auto" />
            <h1 className="text-4xl font-bold mt-4">Chào mừng đến với NOVA</h1>
            <p className="text-lg text-gray-300 mt-2">Trợ lý học tập AI của bạn.</p>
        </div>
        
        <div className="flex flex-col gap-5">
            <button
                onClick={onLoginClick}
                className="w-full px-5 py-4 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50"
            >
                Đăng nhập / Đăng ký
            </button>
            <button
                onClick={onGuestContinue}
                className="w-full px-5 py-3 text-gray-300 rounded-xl font-medium hover:bg-slate-800/80 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-slate-600"
            >
                Tiếp tục với tư cách khách
            </button>
        </div>
      </div>
      <div className="absolute bottom-6 text-center">
          <button onClick={onChangelogClick} className="text-sm text-gray-400 hover:text-gray-200 underline transition-colors">
              Xem chi tiết phiên bản v1.0.0
          </button>
      </div>
    </div>
  );
};

export default AuthScreen;
