import React, { useState } from 'react';
import { XCircleIcon } from './Icons';

interface AuthModalProps {
    onClose: () => void;
    onLogin: (username: string, password: string) => Promise<void>;
    onSignup: (username: string, password: string) => Promise<void>;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin, onSignup }) => {
    const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            setError('Tên đăng nhập không được để trống.');
            return;
        }
         if (!password.trim()) {
            setError('Mật khẩu không được để trống.');
            return;
        }
        if (activeTab === 'signup' && password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            if (activeTab === 'login') {
                await onLogin(username, password);
            } else {
                await onSignup(username, password);
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
            ? 'bg-card shadow text-primary'
            : 'text-text-secondary hover:bg-card/50'
        }`;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md mx-auto bg-card-secondary rounded-2xl shadow-xl transform transition-all" onClick={(e) => e.stopPropagation()}>
                <div className="relative p-6">
                     <button onClick={onClose} className="absolute top-3 right-3 text-text-secondary hover:text-text-primary">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                    <div className="w-full">
                        <div className="flex space-x-1 rounded-xl bg-background p-1 mb-6">
                            <button onClick={() => setActiveTab('login')} className={tabClasses('login')}>
                                Đăng nhập
                            </button>
                            <button onClick={() => setActiveTab('signup')} className={tabClasses('signup')}>
                                Đăng ký
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-text-primary mb-2">
                                    Tên đăng nhập
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-card text-text-primary"
                                    placeholder="ví dụ: user123"
                                    autoFocus
                                />
                            </div>
                             <div>
                                <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                                    Mật khẩu
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-card text-text-primary"
                                    placeholder="••••••••"
                                />
                            </div>
                            {activeTab === 'signup' && (
                                <div>
                                    <label htmlFor="confirm-password" className="block text-sm font-medium text-text-primary mb-2">
                                        Xác nhận mật khẩu
                                    </label>
                                    <input
                                        type="password"
                                        id="confirm-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-card text-text-primary"
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-text bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60"
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
