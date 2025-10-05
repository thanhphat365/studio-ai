import React from 'react';
import { NovaIcon } from './Icons';
import { User } from '../types';

interface ChatWelcomeScreenProps {
    currentUser: User | null;
}

const ChatWelcomeScreen: React.FC<ChatWelcomeScreenProps> = ({ currentUser }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary">
            <div className="max-w-md">
                <NovaIcon className="w-24 h-24 text-primary mx-auto" />
                {currentUser ? (
                  <h1 className="text-3xl sm:text-4xl font-bold mt-4 text-text-primary">Chào mừng trở lại, {currentUser.username}!</h1>
                ) : (
                  <h1 className="text-3xl sm:text-4xl font-bold mt-4 text-text-primary">Chào mừng đến với NOVA</h1>
                )}
                <p className="text-lg mt-2">Trợ lý học tập AI của bạn.</p>
                <p className="mt-8 max-w-lg text-text-secondary">
                    Chọn một chế độ ở trên cùng để bắt đầu. Bạn có thể giải bài tập với hướng dẫn chi tiết hoặc ôn lại các khái niệm quan trọng.
                </p>
            </div>
        </div>
    );
}

export default ChatWelcomeScreen;
