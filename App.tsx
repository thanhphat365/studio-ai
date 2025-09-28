
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatInput from './components/ChatInput';
import ChatMessageComponent from './components/ChatMessage';
import Header from './components/Header';
import { NovaIcon, PencilIcon, LightningBoltIcon } from './components/Icons';
import { EducationalStage, DifficultyLevel, ChatMessage, UploadedFile, Part, LearningMode, Theme } from './types';
import { generateResponseStream, generateImage } from './services/geminiService';
import StartScreen from './components/StartScreen';
import CameraCapture from './components/CameraCapture';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // result is "data:image/png;base64,iVBORw0KGgo..."
            const base64Data = result.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = (error) => reject(error);
    });
};

// Component for user to choose between Socratic and Direct solving.
const ChoiceSelector: React.FC<{ onSelect: (mode: LearningMode) => void; isLoading: boolean; }> = ({ onSelect, isLoading }) => {
  return (
    <div className="max-w-4xl mx-auto my-4">
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4">
        <p className="text-center font-semibold text-gray-800 dark:text-gray-200 mb-3">Bạn muốn tiếp tục như thế nào?</p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            <button
                onClick={() => onSelect('solve_socratic')}
                disabled={isLoading}
                className="flex w-full sm:w-auto items-center justify-center gap-3 px-5 py-3 bg-indigo-600 text-white rounded-full font-semibold shadow-md hover:bg-indigo-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <PencilIcon className="w-5 h-5" />
                <span>Hướng dẫn từng bước</span>
            </button>
            <button
                onClick={() => onSelect('solve_direct')}
                disabled={isLoading}
                className="flex w-full sm:w-auto items-center justify-center gap-3 px-5 py-3 bg-gray-600 text-white rounded-full font-semibold shadow-md hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
  const [appState, setAppState] = useState<'start' | 'chat'>('start');
  const [learningMode, setLearningMode] = useState<LearningMode | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [educationalStage, setEducationalStage] = useState<EducationalStage>(EducationalStage.MiddleSchool);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(DifficultyLevel.Basic);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [fileParts, setFileParts] = useState<Part[] | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
  const [isAwaitingChoice, setIsAwaitingChoice] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (appState === 'chat') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, appState, isAwaitingChoice]);
  
  // Theme management effect
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleClearFile = () => {
    setUploadedFile(null);
    setFileParts(null);
  };

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (appState !== 'chat' || isLoading || isCameraOpen || isAwaitingChoice) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    let imageFile: File | null = null;
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
            imageFile = items[i].getAsFile();
            break; 
        }
    }

    if (imageFile) {
        event.preventDefault();
        
        setIsLoading(true);
        setError(null);
        handleClearFile();

        try {
            const base64Data = await fileToBase64(imageFile);
            const fileName = `Ảnh dán_${new Date().toISOString()}.png`;

            setUploadedFile({
                name: fileName,
                type: imageFile.type,
                base64Data,
            });

            setFileParts([{
                inlineData: {
                    mimeType: imageFile.type,
                    data: base64Data,
                }
            }]);

        } catch (err) {
            const errorMsg = 'Lỗi xử lý ảnh dán. Vui lòng thử lại.';
            setError(errorMsg);
            console.error(err);
            handleClearFile();
        } finally {
            setIsLoading(false);
        }
    }
  }, [appState, isLoading, isCameraOpen, isAwaitingChoice]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
        window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true); 
    setError(null);
    setUploadedFile({ name: file.name, type: file.type, base64Data: '' }); 

    try {
        if (file.type === 'application/pdf') {
            const pdfjsLib = (window as any).pdfjsLib;
            if (!pdfjsLib) {
                throw new Error("PDF.js library is not loaded.");
            }
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const parts: Part[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                if (pageText.trim()) {
                    parts.push({ text: `--- Nội dung trang ${i} ---\n${pageText}` });
                }

                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context!, viewport: viewport }).promise;
                
                const imageDataUrl = canvas.toDataURL('image/jpeg');
                const base64String = imageDataUrl.split(',')[1];
                
                parts.push({
                    text: `--- Hình ảnh trang ${i} ---`,
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: base64String,
                    }
                });
            }
            setFileParts(parts);
        } else { 
            const base64Data = await fileToBase64(file);
            const singlePart = {
                inlineData: {
                    mimeType: file.type,
                    data: base64Data,
                }
            };
            setFileParts([singlePart]);
        }
    } catch (err) {
        const errorMsg = 'Lỗi xử lý tệp. Vui lòng thử lại.';
        setError(errorMsg);
        console.error(err);
        setUploadedFile(null);
        setFileParts(null);
    } finally {
        setIsLoading(false); 
        if (event.target) {
            event.target.value = '';
        }
    }
  };
  
  const handlePhotoTaken = (base64Data: string) => {
    const fileName = `Ảnh chụp_${new Date().toISOString()}.jpg`;
    setUploadedFile({
        name: fileName,
        type: 'image/jpeg',
        base64Data,
    });
    setFileParts([{
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data,
        }
    }]);
    setIsCameraOpen(false);
  };
  
  const handleSelectMode = (mode: LearningMode) => {
    setLearningMode(mode);
    setAppState('chat');
    
    let welcomeMessageText = '';
    switch (mode) {
      case 'solve_socratic':
        welcomeMessageText = 'Tuyệt vời! Hãy đưa ra bài tập em muốn được hướng dẫn nhé. Em có thể gõ lại đề bài, tải lên hình ảnh, chụp ảnh hoặc dán ảnh bài tập vào đây.';
        break;
      case 'review':
        welcomeMessageText = 'Được thôi! Em muốn ôn lại chủ đề hay kiến thức cụ thể nào?';
        break;
      default:
        welcomeMessageText = 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?';
        break;
    }
      
    const initialMessage: ChatMessage = {
      role: 'model',
      parts: [{ text: welcomeMessageText }],
    };
    setMessages([initialMessage]);
  };
    
  const processAndStreamResponse = useCallback(async (
    messageHistory: ChatMessage[],
    mode: LearningMode | null,
  ) => {
    setIsLoading(true);
    setError(null);
    
    const modelMessageId = `model-msg-${Date.now()}`;
    const newModelMessage: ChatMessage = {
        id: modelMessageId,
        role: 'model',
        parts: [{ text: '' }],
        isStreaming: true
    };
    setMessages(prev => [...prev, newModelMessage]);
    
    let fullResponseText = '';

    try {
        const stream = generateResponseStream(messageHistory, educationalStage, difficultyLevel, mode);

        for await (const chunk of stream) {
            fullResponseText += chunk;
            setMessages(prev => prev.map(msg =>
                msg.id === modelMessageId
                    ? { ...msg, parts: [{ text: fullResponseText }] }
                    : msg
            ));
        }
        
        const imageGenRegex = /\[GENERATE_IMAGE:\s*"([^"]+)"\]/g;
        const imagePrompts: string[] = [];
        let match;
        while ((match = imageGenRegex.exec(fullResponseText)) !== null) {
            imagePrompts.push(match[1]);
        }

        const cleanedText = fullResponseText.replace(imageGenRegex, '').trim();
        
        // Combine the final text update with setting isStreaming to false
        // This prevents re-renders that could race with MathJax typesetting
        if (cleanedText || imagePrompts.length > 0) {
            setMessages(prev => prev.map(msg =>
                msg.id === modelMessageId
                    ? { ...msg, parts: [{ text: cleanedText }], isStreaming: false }
                    : msg
            ));
        } else {
            // If message is empty after cleaning, remove it
            setMessages(prev => prev.filter(msg => msg.id !== modelMessageId));
        }
        
        for (const prompt of imagePrompts) {
            const placeholderId = `img-placeholder-${Date.now()}-${Math.random()}`;
            const placeholderMessage: ChatMessage = { role: 'model', parts: [{ text: `Đang tạo hình ảnh: "${prompt}"...` }], id: placeholderId };
            setMessages(prev => [...prev, placeholderMessage]);

            try {
                const imageBase64 = await generateImage(prompt);
                const imageResponse: ChatMessage = {
                    role: 'model',
                    parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }]
                };
                setMessages(prev => prev.map(msg => msg.id === placeholderId ? imageResponse : msg));
            } catch (imgErr) {
                console.error(imgErr);
                const errorMsg = `Rất tiếc, không thể tạo hình ảnh cho: "${prompt}"`;
                const errorResponse: ChatMessage = { role: 'model', parts: [{ text: errorMsg }] };
                setMessages(prev => prev.map(msg => msg.id === placeholderId ? errorResponse : msg));
            }
        }

    } catch (err) {
      const errorMessage = 'Đã xảy ra lỗi khi nhận phản hồi. Vui lòng kiểm tra lại API key và thử lại.';
      setError(errorMessage);
      console.error(err);
      setMessages(prev => prev.map(msg => 
        msg.id === modelMessageId 
            ? { role: 'model', parts: [{ text: errorMessage }], isStreaming: false }
            : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [educationalStage, difficultyLevel]);

  const handleSendMessage = useCallback(async () => {
    if (isLoading || isAwaitingChoice || (!input.trim() && (!fileParts || fileParts.length === 0))) return;

    const userParts: Part[] = [...(fileParts || [])];
    if (input.trim()) {
        userParts.push({ text: input });
    }

    const newUserMessage: ChatMessage = { role: 'user', parts: userParts };
    const currentMessages = [...messages, newUserMessage];
    setMessages(currentMessages);
    setInput('');
    setUploadedFile(null);
    setFileParts(null);
    
    // If it's the first problem in Socratic mode, wait for user's choice
    if (learningMode === 'solve_socratic' && messages.length === 1) {
        setIsAwaitingChoice(true);
    } else {
        await processAndStreamResponse(currentMessages, learningMode);
    }
  }, [input, fileParts, messages, learningMode, isLoading, isAwaitingChoice, processAndStreamResponse]);

  const handleChoiceSelected = async (selectedMode: LearningMode) => {
    setIsAwaitingChoice(false);
    setLearningMode(selectedMode);
    
    const choiceText = selectedMode === 'solve_socratic'
        ? 'Hướng dẫn tôi từng bước.'
        : 'Cho tôi xem lời giải chi tiết.';
    const choiceMessage: ChatMessage = { role: 'user', parts: [{ text: choiceText }] };
    
    const historyForApi = [...messages];
    setMessages(prev => [...prev, choiceMessage]);
    
    await processAndStreamResponse(historyForApi, selectedMode);
  };

    const ModelThinkingIndicator = () => (
        <div className="flex justify-start mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center mr-3">
                <NovaIcon className="w-7 h-7 text-white" />
            </div>
            <div className="max-w-2xl p-4 rounded-2xl shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 self-start">
                <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
                    <span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                </div>
            </div>
        </div>
    );

  if (appState === 'start') {
    return <StartScreen onSelectMode={handleSelectMode} />;
  }

  return (
    <div className="flex flex-col h-screen font-sans text-gray-900 dark:text-gray-100">
        {isCameraOpen && (
            <CameraCapture
                onCapture={handlePhotoTaken}
                onClose={() => setIsCameraOpen(false)}
            />
        )}
        <Header 
            theme={theme}
            setTheme={setTheme}
            selectedStage={educationalStage}
            setSelectedStage={setEducationalStage}
            selectedDifficulty={difficultyLevel}
            setSelectedDifficulty={setDifficultyLevel}
            isLoading={isLoading || isAwaitingChoice}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <NovaIcon className="w-1/2 max-w-lg h-auto text-gray-500 opacity-10" />
            </div>
            <div className="max-w-4xl mx-auto relative z-10">
                {messages.map((msg, index) => (
                    <ChatMessageComponent key={msg.id || index} message={msg} />
                ))}
                {isAwaitingChoice && <ChoiceSelector onSelect={handleChoiceSelected} isLoading={isLoading} />}
                {isLoading && messages[messages.length - 1]?.role !== 'model' && <ModelThinkingIndicator />}
                {error && <div className="text-red-500 text-center p-2">{error}</div>}
                <div ref={chatEndRef} />
            </div>
        </main>

        <footer className="sticky bottom-0 z-10">
            <ChatInput
                input={input}
                setInput={setInput}
                handleSendMessage={handleSendMessage}
                handleFileChange={handleFileChange}
                onOpenCamera={() => setIsCameraOpen(true)}
                isLoading={isLoading || isAwaitingChoice}
                uploadedFile={uploadedFile}
                onClearFile={handleClearFile}
            />
        </footer>
    </div>
  );
};

export default App;
