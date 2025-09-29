
import React, { useState } from 'react';
import { XCircleIcon } from './Icons';

interface AuthModalProps {
    onClose: () => void;
    onLogin: (username: string) => Promise<void>;
    onSignup: (username: string) => Promise<void>;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin, onSignup }) => {
    const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
    const [username, setUsername] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            setError('Tên đăng nhập không được để trống.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            if (activeTab === 'login') {
                await onLogin(username);
            } else {
                await onSignup(username);
            }
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const tabClasses = (tabName: 'login' | 'signup') => 
        `w-full py-2.5 text-sm font-medium leading-5 text-center rounded-lg focus:outline-none transition-colors ${
        activeTab === tabName
            ? 'bg-white dark:bg-slate-700 shadow text-indigo-700 dark:text-indigo-300'
            : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
        }`;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md mx-auto bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-xl transform transition-all" onClick={(e) => e.stopPropagation()}>
                <div className="relative p-6">
                     <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                    <div className="w-full">
                        <div className="flex space-x-1 rounded-xl bg-slate-200 dark:bg-slate-800 p-1 mb-6">
                            <button onClick={() => setActiveTab('login')} className={tabClasses('login')}>
                                Đăng nhập
                            </button>
                            <button onClick={() => setActiveTab('signup')} className={tabClasses('signup')}>
                                Đăng ký
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tên đăng nhập
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-200"
                                    placeholder="ví dụ: user123"
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                            <div className="mt-6">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 dark:focus:ring-offset-slate-900"
                                >
                                    {isLoading ? 'Đang xử lý...' : (activeTab === 'login' ? 'Đăng nhập' : 'Đăng ký')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;