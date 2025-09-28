
import React from 'react';
import { PaperClipIcon, SendIcon, XCircleIcon, CameraIcon } from './Icons';
import Spinner from './Spinner';
import { UploadedFile } from '../types';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSendMessage: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenCamera: () => void;
  isLoading: boolean;
  uploadedFile: UploadedFile | null;
  onClearFile: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSendMessage,
  handleFileChange,
  onOpenCamera,
  isLoading,
  uploadedFile,
  onClearFile,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isLoading) {
        handleSendMessage();
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-4xl mx-auto">
        {uploadedFile && (
            <div className="mb-2 flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded-md text-sm">
                <span className="text-gray-700 dark:text-gray-200 truncate">
                    {uploadedFile.name}
                </span>
                <button
                    onClick={onClearFile}
                    className="text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                    disabled={isLoading}
                    aria-label="Hủy tệp"
                >
                    <XCircleIcon className="w-5 h-5" />
                </button>
            </div>
        )}
        <div className="relative flex items-center bg-slate-200 dark:bg-gray-900 rounded-full p-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,application/pdf,.txt,.md,.csv"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                aria-label="Đính kèm tệp"
            >
                <PaperClipIcon className="w-6 h-6" />
            </button>
            <button
                onClick={onOpenCamera}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                aria-label="Chụp ảnh"
            >
                <CameraIcon className="w-6 h-6" />
            </button>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi hoặc mô tả tệp của bạn..."
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 pl-2 pr-12"
                rows={1}
                disabled={isLoading}
            />
            <button
                onClick={handleSendMessage}
                disabled={isLoading || (!input.trim() && !uploadedFile)}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-full w-10 h-10 flex items-center justify-center"
            >
                {isLoading ? <Spinner /> : <SendIcon className="w-5 h-5" />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;