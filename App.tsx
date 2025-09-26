
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatInput from './components/ChatInput';
import ChatMessageComponent from './components/ChatMessage';
import LevelSelector from './components/LevelSelector';
import { BrainCircuitIcon } from './components/Icons';
import { EducationalStage, DifficultyLevel, ChatMessage, UploadedFile, Part, LearningMode } from './types';
import { generateResponse, generateImage } from './services/geminiService';
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
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (appState === 'chat') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, appState]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Use a general loading indicator for file processing
    setIsLoading(true); 
    setError(null);
    // Set file name for UI immediately
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
                
                // 1. Extract text content
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                if (pageText.trim()) {
                    parts.push({ text: `--- Nội dung trang ${i} ---\n${pageText}` });
                }

                // 2. Render page to a canvas to get a full image of the page
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
        } else { // Handle standard images and text files
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
        setIsLoading(false); // File processing is complete
        if (event.target) {
            event.target.value = ''; // Reset file input
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
    setIsCameraOpen(false); // Close camera modal
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setFileParts(null);
  };
  
  const handleSelectMode = (mode: LearningMode) => {
    setLearningMode(mode);
    setAppState('chat');
    
    const welcomeMessageText = mode === 'solve'
      ? 'Tuyệt vời! Hãy đưa ra bài tập em muốn giải nhé. Em có thể gõ lại đề bài, tải lên hình ảnh, hoặc chụp ảnh bài tập.'
      : 'Được thôi! Em muốn ôn lại chủ đề hay kiến thức cụ thể nào?';
      
    const initialMessage: ChatMessage = {
      role: 'model',
      parts: [{ text: welcomeMessageText }],
    };
    setMessages([initialMessage]);
  };

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() && (!fileParts || fileParts.length === 0)) return;

    setIsLoading(true);
    setError(null);

    const userParts: Part[] = [...(fileParts || [])];
    if (input.trim()) {
        userParts.push({ text: input });
    }

    const newUserMessage: ChatMessage = { role: 'user', parts: userParts };
    const currentMessages = [...messages, newUserMessage];
    setMessages(currentMessages);

    // Clear inputs for next message
    setInput('');
    setUploadedFile(null);
    setFileParts(null);

    try {
      const response = await generateResponse(currentMessages, educationalStage, difficultyLevel, learningMode);
      
      let modelText = response.text;
      const imageGenRegex = /\[GENERATE_IMAGE:\s*"([^"]+)"\]/g;
      const imagePrompts: string[] = [];
      let match;
      while ((match = imageGenRegex.exec(modelText)) !== null) {
          imagePrompts.push(match[1]);
      }

      const cleanedText = modelText.replace(imageGenRegex, '').trim();

      if (cleanedText) {
          const textResponse: ChatMessage = { role: 'model', parts: [{ text: cleanedText }] };
          setMessages(prev => [...prev, textResponse]);
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
      const errorResponse: ChatMessage = { role: 'model', parts: [{text: errorMessage}]};
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }, [input, fileParts, educationalStage, difficultyLevel, messages, learningMode]);

    const ModelThinkingIndicator = () => (
        <div className="flex justify-start mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center mr-3">
                <BrainCircuitIcon className="w-6 h-6 text-white" />
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
        <header className="flex flex-col md:flex-row justify-center items-center gap-4 p-4 shadow-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <BrainCircuitIcon className="w-8 h-8 text-indigo-500 mr-2" />
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                Trợ lý học tập AI
              </h1>
            </div>
            <LevelSelector 
                selectedStage={educationalStage} 
                setSelectedStage={setEducationalStage}
                selectedDifficulty={difficultyLevel}
                setSelectedDifficulty={setDifficultyLevel}
                isLoading={isLoading} 
            />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {messages.map((msg, index) => (
                    <ChatMessageComponent key={msg.id || index} message={msg} />
                ))}
                {isLoading && <ModelThinkingIndicator />}
                {error && <div className="text-red-500 text-center p-2">{error}</div>}
                <div ref={chatEndRef} />
            </div>
        </main>

        <footer className="sticky bottom-0">
            <ChatInput
                input={input}
                setInput={setInput}
                handleSendMessage={handleSendMessage}
                handleFileChange={handleFileChange}
                onOpenCamera={() => setIsCameraOpen(true)}
                isLoading={isLoading}
                uploadedFile={uploadedFile}
                onClearFile={handleClearFile}
            />
        </footer>
    </div>
  );
};

export default App;