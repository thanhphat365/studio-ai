import React from 'react';
import { XCircleIcon } from './Icons';

interface ChangelogModalProps {
    onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-lg mx-auto bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-xl transform transition-all" onClick={(e) => e.stopPropagation()}>
                <div className="relative p-6">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Chi tiết phiên bản v1.0.0</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Các tính năng và cải tiến chính trong phiên bản này.</p>
                    
                    <ul className="space-y-4 text-gray-700 dark:text-gray-300">
                        <li className="flex items-start">
                            <span className="text-indigo-500 font-bold mr-3">✔</span>
                            <div>
                                <h3 className="font-semibold">Hệ thống Tài khoản</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Lưu lại lịch sử trò chuyện và cài đặt học tập của bạn. Đăng nhập để tiếp tục phiên làm việc trên mọi thiết bị.</p>
                            </div>
                        </li>
                        <li className="flex items-start">
                            <span className="text-indigo-500 font-bold mr-3">✔</span>
                            <div>
                                <h3 className="font-semibold">Hai Chế độ Giải bài tập</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Chọn giữa "Hướng dẫn từng bước" theo phương pháp Socratic hoặc "Xem lời giải chi tiết" để học theo cách của bạn.</p>
                            </div>
                        </li>
                         <li className="flex items-start">
                            <span className="text-indigo-500 font-bold mr-3">✔</span>
                            <div>
                                <h3 className="font-semibold">Hỗ trợ Tải lên Đa dạng</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Tải lên hình ảnh, tài liệu PDF, hoặc chụp ảnh trực tiếp để đặt câu hỏi về nội dung trực quan.</p>
                            </div>
                        </li>
                        <li className="flex items-start">
                            <span className="text-indigo-500 font-bold mr-3">✔</span>
                            <div>
                                <h3 className="font-semibold">Tạo Hình ảnh Minh họa</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">NOVA có thể tự động tạo hình ảnh để giải thích các khái niệm phức tạp, giúp việc học trở nên sinh động hơn.</p>
                            </div>
                        </li>
                    </ul>
                     <div className="mt-6 text-center">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                        >
                            Đã hiểu
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangelogModal;
