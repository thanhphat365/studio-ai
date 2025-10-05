import React, { useRef, useEffect } from 'react';
import { PaperClipIcon, SendIcon, XCircleIcon, CameraIcon, DocumentTextIcon } from './Icons';
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
  onClearAllFiles: () => void;
  onRemoveFile: (index: number) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSendMessage,
  handleFileChange,
  onOpenCamera,
  isLoading,
  uploadedFiles,
  onClearAllFiles,
  onRemoveFile,
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
    <div className="bg-card/80 backdrop-blur-sm p-4 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="w-full flex flex-col bg-card-secondary rounded-2xl shadow-sm border border-border">
          {uploadedFiles.length > 0 && (
              <div className="p-3 border-b border-border space-y-3">
                  <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary">Tệp đính kèm</span>
                      <button
                          onClick={onClearAllFiles}
                          className="text-xs text-text-secondary hover:text-red-500 font-semibold"
                          disabled={isLoading}
                          aria-label="Hủy tất cả các tệp"
                      >
                          Xóa tất cả
                      </button>
                  </div>
                  <div className="flex space-x-3 overflow-x-auto pb-2 -mb-2">
                      {uploadedFiles.map((file, index) => (
                          <div key={index} className="relative shrink-0 w-20">
                              <div className="group block w-20 h-20 rounded-lg overflow-hidden border border-border bg-card relative">
                                  {file.type.startsWith('image/') ? (
                                      <img
                                          src={`data:${file.type};base64,${file.base64Data}`}
                                          alt={file.name}
                                          className="w-full h-full object-cover"
                                      />
                                  ) : (
                                      <div className="flex flex-col items-center justify-center h-full p-2 text-text-secondary">
                                          <DocumentTextIcon className="w-8 h-8" />
                                      </div>
                                  )}
                                  
                                  {/* Progress Overlay: shown when progress is between 0 and 100 */}
                                  {file.progress !== undefined && file.progress >= 0 && file.progress <= 100 && (
                                    <div className="absolute inset-0 flex items-end bg-black/40 p-1.5 transition-opacity duration-300">
                                        <div className="w-full bg-slate-100/30 rounded-full h-1.5 backdrop-blur-sm">
                                            <div 
                                                className="bg-primary h-1.5 rounded-full transition-all duration-200 ease-linear" 
                                                style={{ width: `${file.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                  )}

                                  {/* Error Overlay: shown when progress is -1 */}
                                  {file.progress === -1 && (
                                    <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center text-white" title="Lỗi xử lý tệp">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                  )}
                              </div>
                              <p className="mt-1 text-xs text-text-secondary truncate" title={file.name}>
                                  {file.name}
                              </p>
                              <button
                                  onClick={() => onRemoveFile(index)}
                                  disabled={isLoading}
                                  className="absolute -top-1.5 -right-1.5 bg-card-secondary rounded-full text-text-secondary hover:text-red-500 hover:bg-card border border-border shadow-sm disabled:opacity-50"
                                  aria-label={`Xóa tệp ${file.name}`}
                              >
                                  <XCircleIcon className="w-5 h-5" />
                              </button>
                          </div>
                      ))}
                  </div>
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
                      className="p-2 text-text-secondary hover:text-primary disabled:opacity-50"
                      aria-label="Đính kèm tệp"
                  >
                      <PaperClipIcon className="w-6 h-6" />
                  </button>
                  <button
                      onClick={onOpenCamera}
                      disabled={isLoading}
                      className="p-2 text-text-secondary hover:text-primary disabled:opacity-50"
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
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none outline-none text-text-primary placeholder-text-secondary py-2.5 min-h-[44px] max-h-52"
                  rows={1}
                  disabled={isLoading}
              />
              <button
                  onClick={handleSendMessage}
                  disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
                  className="self-end bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-text rounded-lg w-10 h-10 flex items-center justify-center shrink-0 transition-colors"
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