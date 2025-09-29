import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatInput from './components/ChatInput';
import ChatMessageComponent from './components/ChatMessage';
import Header from './components/Header';
import { NovaIcon, PencilIcon, LightningBoltIcon } from './components/Icons';
import { EducationalStage, DifficultyLevel, ChatMessage, UploadedFile, Part, LearningMode, Theme, User } from './types';
import { generateResponseStream, generateImage } from './services/geminiService';
import StartScreen from './components/StartScreen';
import CameraCapture from './components/CameraCapture';
import AuthModal from './components/AuthModal';
import AuthScreen from './components/AuthScreen';
import ChangelogModal from './components/ChangelogModal';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = (error) => reject(error);
    });
};

const ChoiceSelector: React.FC<{ onSelect: (mode: LearningMode) => void; isLoading: boolean; }> = ({ onSelect, isLoading }) => {
  return (
    <div className="max-w-4xl mx-auto my-4">
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4">
        <p className="text-center font-semibold text-gray-800 dark:text-gray-200 mb-3">Bạn muốn tiếp tục như thế nào?</p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            <button
                onClick={() => onSelect('solve_socratic')}
                disabled={isLoading}
                className="flex w-full sm:w-auto items-center justify-center gap-3 px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <PencilIcon className="w-5 h-5" />
                <span>Hướng dẫn từng bước</span>
            </button>
            <button
                onClick={() => onSelect('solve_direct')}
                disabled={isLoading}
                className="flex w-full sm:w-auto items-center justify-center gap-3 px-5 py-3 bg-gray-600 text-white rounded-xl font-semibold shadow-md hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <LightningBoltIcon className="w-5 h-5" />
                <span>Xem lời giải chi tiết</span>
            </button>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [appFlowState, setAppFlowState] = useState<'auth' | 'start' | 'chat'>('auth');
  const [learningMode, setLearningMode] = useState<LearningMode | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [educationalStage, setEducationalStage] = useState<EducationalStage>(EducationalStage.MiddleSchool);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(DifficultyLevel.Basic);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileParts, setFileParts] = useState<Part[] | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
  const [isAwaitingChoice, setIsAwaitingChoice] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom effect
  useEffect(() => {
    if (appFlowState === 'chat') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, appFlowState, isAwaitingChoice]);
  
  // Theme management effect
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auth: Check for logged-in user on initial load
  useEffect(() => {
    const loggedInUser = localStorage.getItem('nova_currentUser');
    if (loggedInUser) {
        // If user is found, setCurrentUser will trigger the next effect
        // which handles loading data and setting the correct flow state.
        setCurrentUser({ username: loggedInUser });
    }
  }, []);

  // Auth: Load user data on login, reset on logout
  useEffect(() => {
    if (currentUser) {
        // Load settings
        const settingsRaw = localStorage.getItem(`nova_settings_${currentUser.username}`);
        if (settingsRaw) {
            const { stage, difficulty } = JSON.parse(settingsRaw);
            setEducationalStage(stage);
            setDifficultyLevel(difficulty);
        } else {
            setEducationalStage(EducationalStage.MiddleSchool);
            setDifficultyLevel(DifficultyLevel.Basic);
        }

        // Load chat history and determine next screen
        const chatHistoryRaw = localStorage.getItem(`nova_chat_${currentUser.username}`);
        if (chatHistoryRaw) {
            const savedMessages = JSON.parse(chatHistoryRaw);
            if (savedMessages && savedMessages.length > 0) {
                setMessages(savedMessages);
                setLearningMode(null); // Reset mode, let user choose or continue
                setAppFlowState('chat'); // Go directly to chat if history exists
            } else {
                 setMessages([]);
                 setAppFlowState('start');
            }
        } else {
            setMessages([]);
            setAppFlowState('start');
        }
    } else {
        // Reset app state on logout
        setMessages([]);
        setLearningMode(null);
        setEducationalStage(EducationalStage.MiddleSchool);
        setDifficultyLevel(DifficultyLevel.Basic);
    }
  }, [currentUser]);

  // Auth: Save chat history
  useEffect(() => {
    if (currentUser && appFlowState === 'chat' && messages.length > 0) {
        // Don't save streaming messages to avoid storing incomplete state
        const isStreaming = messages[messages.length - 1]?.isStreaming;
        if (!isStreaming) {
            localStorage.setItem(`nova_chat_${currentUser.username}`, JSON.stringify(messages));
        }
    }
  }, [messages, currentUser, appFlowState]);

  // Auth: Save user settings
  useEffect(() => {
    if (currentUser) {
        const settings = { stage: educationalStage, difficulty: difficultyLevel };
        localStorage.setItem(`nova_settings_${currentUser.username}`, JSON.stringify(settings));
    }
  }, [educationalStage, difficultyLevel, currentUser]);

  const handleSignup = async (username: string) => {
    const usersRaw = localStorage.getItem('nova_users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    if (users.includes(username)) {
        throw new Error('Tên đăng nhập đã tồn tại.');
    }
    users.push(username);
    localStorage.setItem('nova_users', JSON.stringify(users));
    await handleLogin(username);
  };

  const handleLogin = async (username: string) => {
    const usersRaw = localStorage.getItem('nova_users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    if (!users.includes(username)) {
        throw new Error('Tên đăng nhập không tồn tại.');
    }
    localStorage.setItem('nova_currentUser', username);
    setCurrentUser({ username }); // This triggers the useEffect above
  };

  const handleLogout = () => {
    localStorage.removeItem('nova_currentUser');
    setCurrentUser(null);
    setAppFlowState('auth'); // Go back to the auth screen
  };

  const handleClearHistory = () => {
    if (!currentUser) return;
    const isConfirmed = window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện không? Hành động này không thể hoàn tác.');
    if (isConfirmed) {
        setMessages([]);
        localStorage.removeItem(`nova_chat_${currentUser.username}`);
        setAppFlowState('start'); // Go back to start to begin a new session
    }
  };

  const handleHomeClick = (e: React.MouseEvent) => {
      e.preventDefault();
      setMessages([]);
      setFileParts(null);
      setUploadedFiles([]);
      setLearningMode(null);
      setError(null);
      setInput('');
      setAppFlowState('start');
  };

  const handleClearFile = () => {
    setUploadedFiles([]);
    setFileParts(null);
  };

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (appFlowState !== 'chat' || isLoading || isCameraOpen || isAwaitingChoice) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if(file) imageFiles.push(file);
        }
    }

    if (imageFiles.length > 0) {
        event.preventDefault();
        
        setIsLoading(true);
        setError(null);

        try {
            const newUploadedFiles: UploadedFile[] = [];
            const newFileParts: Part[] = [];

            for(const imageFile of imageFiles) {
                const base64Data = await fileToBase64(imageFile);
                const fileName = `Ảnh dán_${new Date().toISOString()}_${Math.random()}.png`;

                newUploadedFiles.push({
                    name: fileName,
                    type: imageFile.type,
                    base64Data,
                });

                newFileParts.push({
                    inlineData: {
                        mimeType: imageFile.type,
                        data: base64Data,
                    }
                });
            }
            
            setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
            setFileParts(prev => [...(prev || []), ...newFileParts]);

        } catch (err) {
            const errorMsg = 'Lỗi xử lý ảnh dán. Vui lòng thử lại.';
            setError(errorMsg);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }
  }, [appFlowState, isLoading, isCameraOpen, isAwaitingChoice]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
        window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true); 
    setError(null);
    
    try {
        const newParts: Part[] = [];
        const newUploadedFiles: UploadedFile[] = [];

        for (const file of Array.from(files)) {
            if (!(file instanceof File)) continue;
            if (file.type === 'application/pdf') {
                const pdfjsLib = (window as any).pdfjsLib;
                if (!pdfjsLib) {
                    throw new Error("PDF.js library is not loaded.");
                }
                
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                newUploadedFiles.push({ name: file.name, type: file.type, base64Data: '' }); // Add for UI display

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    if (pageText.trim()) {
                        newParts.push({ text: `--- Nội dung trang ${i} từ tệp ${file.name} ---\n${pageText}` });
                    }

                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (!context) continue;
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    
                    const imageDataUrl = canvas.toDataURL('image/jpeg');
                    const base64String = imageDataUrl.split(',')[1];
                    
                    newParts.push({
                        text: `--- Hình ảnh trang ${i} từ tệp ${file.name} ---`,
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64String,
                        }
                    });
                }
            } else { 
                const base64Data = await fileToBase64(file);
                newParts.push({
                    inlineData: {
                        mimeType: file.type,
                        data: base64Data,
                    }
                });
                newUploadedFiles.push({ name: file.name, type: file.type, base64Data });
            }
        }

        setFileParts(prev => [...(prev || []), ...newParts]);
        setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    } catch (err) {
        const errorMsg = 'Lỗi xử lý tệp. Vui lòng thử lại.';
        setError(errorMsg);
        console.error(err);
    } finally {
        setIsLoading(false); 
        if (event.target) {
            event.target.value = '';
        }
    }
  };
  
  const handlePhotoTaken = (base64Data: string) => {
    const fileName = `Ảnh chụp_${new Date().toISOString()}.jpg`;
    const newFile = {
        name: fileName,
        type: 'image/jpeg',
        base64Data,
    };
    const newPart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data,
        }
    };
    setUploadedFiles(prev => [...prev, newFile]);
    setFileParts(prev => [...(prev || []), newPart]);
    setIsCameraOpen(false);
  };
  
  const handleSelectMode = (mode: LearningMode) => {
    setLearningMode(mode);
    setAppFlowState('chat');
    
    let welcomeMessageText = '';
    switch (mode) {
      case 'solve_socratic':
        welcomeMessageText = 'Chào bạn! Mình là NOVA. Hãy đưa ra bài tập hoặc câu hỏi, mình sẽ hướng dẫn bạn từng bước để tìm ra lời giải nhé.';
        break;
      case 'review':
        welcomeMessageText = 'Chào bạn! Mình là NOVA. Bạn muốn ôn tập về chủ đề hay khái niệm nào?';
        break;
      case 'solve_direct':
         welcomeMessageText = 'Chào bạn! Mình là NOVA. Hãy đưa ra bài tập, mình sẽ cung cấp lời giải chi tiết cho bạn.';
        break;
    }
    setMessages([{
      id: `welcome-${Date.now()}`,
      role: 'model',
      parts: [{ text: welcomeMessageText }]
    }]);
  };
    
  const processStreamedResponse = async (stream: AsyncGenerator<string>, existingModelMessageIndex: number) => {
    const imageGenRegex = /\[GENERATE_IMAGE:\s*"([^"]+)"\]/g;
    let unprocessedText = ''; // Buffer for detecting image generation commands

    for await (const chunk of stream) {
        unprocessedText += chunk;

        setMessages(prev => {
            const newMessages = [...prev];
            if (existingModelMessageIndex >= newMessages.length) return prev;

            // Create a deep enough copy to avoid mutation
            const updatedMessage = {
                ...newMessages[existingModelMessageIndex],
                parts: newMessages[existingModelMessageIndex].parts.map(p => ({ ...p })),
                isStreaming: true,
            };

            // Find the main text part to append to.
            const textPartIndex = updatedMessage.parts.findIndex(p => p.text !== undefined && !p.inlineData);

            if (textPartIndex !== -1) {
                updatedMessage.parts[textPartIndex].text = (updatedMessage.parts[textPartIndex].text || '') + chunk;
            } else {
                updatedMessage.parts.unshift({ text: chunk });
            }

            newMessages[existingModelMessageIndex] = updatedMessage;
            return newMessages;
        });

        // Image generation logic
        let match;
        let lastIndex = 0;
        while ((match = imageGenRegex.exec(unprocessedText)) !== null) {
            const prompt = match[1];
            try {
                // This logic is async, so we fire and let it update state when done.
                generateImage(prompt).then(base64Image => {
                    const imagePart: Part = {
                        inlineData: { mimeType: 'image/jpeg', data: base64Image },
                    };
                    setMessages(prev => {
                        const updatedMessages = [...prev];
                        if (existingModelMessageIndex >= updatedMessages.length) return prev;

                        const msgToUpdate = {
                             ...updatedMessages[existingModelMessageIndex],
                             parts: updatedMessages[existingModelMessageIndex].parts.map(p => ({ ...p })),
                        };
                        
                        if (!msgToUpdate.parts.some(p => p.inlineData?.data === base64Image)) {
                            msgToUpdate.parts.push({ text: "Đây là hình ảnh minh họa thầy đã tạo:" });
                            msgToUpdate.parts.push(imagePart);
                        }
                        updatedMessages[existingModelMessageIndex] = msgToUpdate;
                        return updatedMessages;
                    });
                });
            } catch (e) {
                console.error("Failed to generate image from stream:", e);
            }
            lastIndex = match.index + match[0].length;
        }
        unprocessedText = unprocessedText.substring(lastIndex);
    }
    
    // Final update after stream ends to clean up tags and set streaming to false
    setMessages(prev => {
        const finalMessages = [...prev];
        if (existingModelMessageIndex >= finalMessages.length) return prev;

        const finalModelMessage = finalMessages[existingModelMessageIndex];
        
        // Create a new parts array for the updated message
        const newParts = finalModelMessage.parts.map(p => ({...p}));

        const textPartIndex = newParts.findIndex(p => p.text !== undefined && !p.inlineData);

        if (textPartIndex !== -1) {
            // Clean the text in the copied part
            newParts[textPartIndex].text = (newParts[textPartIndex].text || '').replace(imageGenRegex, '').trim();
        }

        const updatedMessage = {
            ...finalModelMessage,
            parts: newParts,
            isStreaming: false,
        };

        finalMessages[existingModelMessageIndex] = updatedMessage;
        return finalMessages;
    });
  };

  const handleSendMessage = async (modeOverride?: LearningMode) => {
    const currentMode = modeOverride || learningMode;
    if (isLoading || (!input.trim() && !fileParts)) return;

    setIsLoading(true);
    setError(null);
    setIsAwaitingChoice(false);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      parts: [],
    };
    
    if (fileParts) {
      userMessage.parts.push(...fileParts);
    }
    if (input.trim()) {
      userMessage.parts.push({ text: input });
    }
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    setInput('');
    setUploadedFiles([]);
    setFileParts(null);
    
    const modelMessagePlaceholder: ChatMessage = {
      id: `model-${Date.now()}`,
      role: 'model',
      parts: [{ text: '' }],
      isStreaming: true
    };
    setMessages(prev => [...prev, modelMessagePlaceholder]);

    try {
        const stream = generateResponseStream(
            newMessages,
            educationalStage,
            difficultyLevel,
            currentMode
        );

        await processStreamedResponse(stream, newMessages.length);

        if (messages.length === 0 && (currentMode === 'solve_socratic' || currentMode === 'solve_direct')) {
            setIsAwaitingChoice(true);
        }

    } catch (err) {
      console.error(err);
      const errorMsg = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
      setError(errorMsg);
      setMessages(prev => {
          const updatedMessages = [...prev];
          const lastMessageIndex = updatedMessages.length - 1;
          if (updatedMessages[lastMessageIndex]?.role === 'model') {
              const errorMessagePart = { text: errorMsg };
              const updatedMessage = {
                ...updatedMessages[lastMessageIndex],
                parts: [errorMessagePart],
                isStreaming: false
              };
              updatedMessages[lastMessageIndex] = updatedMessage;
          }
          return updatedMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoiceSelection = (selectedMode: LearningMode) => {
        setIsAwaitingChoice(false);
        handleSendMessage(selectedMode);
  };
  
  if (isCameraOpen) {
    return <CameraCapture onCapture={handlePhotoTaken} onClose={() => setIsCameraOpen(false)} />;
  }
  
  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-nova-dark font-sans">
      
      {appFlowState === 'auth' && (
        <AuthScreen
          onLoginClick={() => setIsAuthModalOpen(true)}
          onGuestContinue={() => {
              setCurrentUser(null);
              setAppFlowState('start');
          }}
          onChangelogClick={() => setIsChangelogModalOpen(true)}
        />
      )}
      
      {appFlowState === 'start' && (
        <StartScreen onSelectMode={handleSelectMode} currentUser={currentUser} />
      )}
      
      {appFlowState === 'chat' && (
        <>
          <Header
            theme={theme}
            setTheme={setTheme}
            selectedStage={educationalStage}
            setSelectedStage={setEducationalStage}
            selectedDifficulty={difficultyLevel}
            setSelectedDifficulty={setDifficultyLevel}
            isLoading={isLoading}
            currentUser={currentUser}
            onLoginClick={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            onHomeClick={handleHomeClick}
            onClearHistory={handleClearHistory}
          />
          <main className="flex-1 overflow-y-auto p-4">
              <div className="max-w-4xl mx-auto">
                  {messages.map((msg, index) => (
                      <ChatMessageComponent key={msg.id || index} message={msg} />
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <ChatMessageComponent message={{ id: 'loading', role: 'model', parts: [{ text: '' }], isStreaming: true }} />
                  )}
                  {error && (
                    <div className="text-red-500 text-center p-2">{error}</div>
                  )}
                  <div ref={chatEndRef} />
              </div>
          </main>
          {isAwaitingChoice && <ChoiceSelector onSelect={handleChoiceSelection} isLoading={isLoading} />}
          <footer className="w-full">
            <ChatInput
              input={input}
              setInput={setInput}
              handleSendMessage={() => handleSendMessage()}
              handleFileChange={handleFileChange}
              onOpenCamera={() => setIsCameraOpen(true)}
              isLoading={isLoading}
              uploadedFiles={uploadedFiles}
              onClearFile={handleClearFile}
            />
          </footer>
        </>
      )}

      {isAuthModalOpen && (
          <AuthModal
              onClose={() => setIsAuthModalOpen(false)}
              onLogin={async (username) => {
                  await handleLogin(username);
                  setIsAuthModalOpen(false);
              }}
              onSignup={async (username) => {
                  await handleSignup(username);
                  setIsAuthModalOpen(false);
              }}
          />
      )}

      {isChangelogModalOpen && (
        <ChangelogModal onClose={() => setIsChangelogModalOpen(false)} />
      )}

    </div>
  );
};

export default App;