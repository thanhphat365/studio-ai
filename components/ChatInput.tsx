
import React, { useRef, useEffect } from 'react';
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
  uploadedFiles: UploadedFile[];
  onClearFile: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSendMessage,
  handleFileChange,
  onOpenCamera,
  isLoading,
  uploadedFiles,
  onClearFile,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isLoading) {
        handleSendMessage();
      }
    }
  };

  // Auto-resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200; // Corresponds to max-h-52
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [input]);

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="max-w-4xl mx-auto">
        <div className="w-full flex flex-col bg-slate-100 dark:bg-slate-900/70 rounded-2xl shadow-sm border border-slate-300 dark:border-slate-700">
          {uploadedFiles.length > 0 && (
              <div className="p-2 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-200 truncate">
                      Đã đính kèm {uploadedFiles.length} tệp.
                  </span>
                  <button
                      onClick={onClearFile}
                      className="text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                      disabled={isLoading}
                      aria-label="Hủy tất cả các tệp"
                  >
                      <XCircleIcon className="w-5 h-5" />
                  </button>
              </div>
          )}
          <div className="flex items-start p-2 space-x-2">
              <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,application/pdf,.txt,.md,.csv"
                  multiple
              />
              <div className="flex items-center pt-2 space-x-1">
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
              </div>
              <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập câu hỏi hoặc mô tả tệp của bạn..."
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 py-2.5 min-h-[44px] max-h-52"
                  rows={1}
                  disabled={isLoading}
              />
              <button
                  onClick={handleSendMessage}
                  disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
                  className="self-end bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg w-10 h-10 flex items-center justify-center shrink-0 transition-colors"
              >
                  {isLoading ? <Spinner /> : <SendIcon className="w-5 h-5" />}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;