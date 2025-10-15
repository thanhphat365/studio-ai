import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatMessage,
  EducationalStage,
  DifficultyLevel,
  LearningMode,
  UploadedFile,
  Part,
  ThemePalette,
  CustomThemeColors,
  User,
  SolvedQuestion,
  FinalAnswerSet
} from './types';
import { generateResponseStream, getSystemInstruction } from './services/aiService';
import { hexToRgb, getContrastingTextColor } from './utils/color';

import Header from './components/Header';
import ChatInput from './components/ChatInput';
import ChatMessageComponent from './components/ChatMessage';
import CameraCapture from './components/CameraCapture';
import CustomThemeModal from './components/CustomThemeModal';
import StartScreen from './components/StartScreen';
import AuthScreen from './components/AuthScreen';
import AuthModal from './components/AuthModal';
import ChangelogModal from './components/ChangelogModal';
import ChatWelcomeScreen from './components/ChatWelcomeScreen';
import PdfViewer from './components/PdfViewer';

// For PDF processing
declare const pdfjsLib: any;

const DEFAULT_CUSTOM_THEME: CustomThemeColors = {
    background: '#0f172a', // slate-900
    text: '#f8fafc',       // slate-50
    primary: '#4f46e5',    // indigo-600
};

// Helper to parse a block of text from the AI stream
const parseStreamBlock = (block: string): { parsedJson: SolvedQuestion | null, cleanedPreamble: string } => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return { parsedJson: null, cleanedPreamble: '' };
    
    let potentialJson = '';
    let preambleText = trimmedBlock;
    
    // Attempt to find JSON inside a markdown code block first
    const codeBlockMatch = trimmedBlock.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

    if (codeBlockMatch && codeBlockMatch[1]) {
        potentialJson = codeBlockMatch[1].trim();
        // The text outside the code block is the preamble
        preambleText = trimmedBlock.replace(codeBlockMatch[0], '').trim();
    } else {
        // Fallback to the old method if no code block is found
        const jsonStartIndex = trimmedBlock.indexOf('{');
        const jsonEndIndex = trimmedBlock.lastIndexOf('}');
        
        if (jsonStartIndex !== -1 && jsonEndIndex > jsonStartIndex) {
            potentialJson = trimmedBlock.substring(jsonStartIndex, jsonEndIndex + 1);
            preambleText = trimmedBlock.substring(0, jsonStartIndex);
        }
    }
    
    if (potentialJson) {
        try {
            // "Safety net" regexes to fix common AI formatting errors before parsing
            // 1. Remove trailing commas, a very common AI mistake.
            potentialJson = potentialJson.replace(/,(?=\s*[}\]])/g, '');

            // 2. Fix unquoted answers (A, B, C, D, etc.)
            potentialJson = potentialJson.replace(/"answer":\s*(A|B|C|D|Đúng|Sai)\s*(?=[,}])/g, '"answer": "$1"');

            // 3. Fix unquoted numbers that should be strings
            potentialJson = potentialJson.replace(/"(answer|number)":\s*(-?\d+(\.\d+)?)\s*(?=[,}])/g, '"$1": "$2"');
            
            // 4. Fix unquoted booleans
            potentialJson = potentialJson.replace(/"isComplete":\s*(True|False)\s*(?=[,}])/gi, (match, p1) => `"isComplete": ${p1.toLowerCase()}`);

            const parsedJson = JSON.parse(potentialJson) as SolvedQuestion;
            
            const cleanedPreamble = preambleText
                .replace(/(?:via-\s*)?(?:```(?:json)?|`json|"json|json)\s*$/i, '')
                .trim();
                
            return { parsedJson, cleanedPreamble };
        } catch (e) {
            // If parsing fails, treat the whole block as text. The original block, not just the preamble.
            return { parsedJson: null, cleanedPreamble: trimmedBlock };
        }
    }
    
    // No JSON found, treat the whole block as preamble text.
    return { parsedJson: null, cleanedPreamble: trimmedBlock };
}


const App: React.FC = () => {
    // App State
    const [appState, setAppState] = useState<'auth' | 'start' | 'chat'>('auth');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Learning & AI Config State
    const [learningMode, setLearningMode] = useState<LearningMode>('solve_socratic');
    const [selectedStage, setSelectedStage] = useState<EducationalStage>(EducationalStage.HighSchool);
    const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>(DifficultyLevel.Basic);
    
    // UI & Modal State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [themePalette, setThemePalette] = useState<ThemePalette>('default');
    const [customThemeColors, setCustomThemeColors] = useState<CustomThemeColors>(DEFAULT_CUSTOM_THEME);
    const [isCustomThemeModalOpen, setIsCustomThemeModalOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
    const [pdfToView, setPdfToView] = useState<string | null>(null);
    const [showSolveAllButton, setShowSolveAllButton] = useState(false);

    // --- Effects ---

    // Load settings and user from localStorage on initial render
    useEffect(() => {
        try {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                const user = JSON.parse(savedUser);
                setCurrentUser(user);
                setAppState('start');
                loadUserSession(user.username);
            }

            const savedSettings = localStorage.getItem('nova-settings');
            if (savedSettings) {
                const {
                    themePalette, customThemeColors, learningMode,
                    selectedStage, selectedDifficulty
                } = JSON.parse(savedSettings);

                setThemePalette(themePalette || 'default');
                setCustomThemeColors(customThemeColors || DEFAULT_CUSTOM_THEME);
                setLearningMode(learningMode || 'solve_socratic');
                setSelectedStage(selectedStage || EducationalStage.HighSchool);
                setSelectedDifficulty(selectedDifficulty || DifficultyLevel.Basic);
            }
        } catch (error) {
            console.error("Failed to load from localStorage", error);
        }
    }, []);
    
    // Scroll to bottom of chat on new message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Apply theme colors to the document root
    useEffect(() => {
        const root = document.documentElement;
        let bg, text, primary, secondary, primaryText;

        switch (themePalette) {
            case 'mint':
                bg = '#f0fdfa'; text = '#0f172a'; primary = '#10b981';
                break;
            case 'twilight':
                bg = '#1e1b4b'; text = '#e0e7ff'; primary = '#818cf8';
                break;
            case 'sepia':
                bg = '#fef3c7'; text = '#422006'; primary = '#d97706';
                break;
            case 'custom':
                bg = customThemeColors.background;
                text = customThemeColors.text;
                primary = customThemeColors.primary;
                break;
            case 'default':
            default:
                bg = '#020617'; text = '#e2e8f0'; primary = '#4f46e5';
        }
        
        primaryText = getContrastingTextColor(primary);
        const isDark = getContrastingTextColor(bg) === '#f8fafc';
        secondary = isDark ? '#94a3b8' : '#334155'; // slate-400 / slate-700
        
        root.style.setProperty('--color-background', hexToRgb(bg) as string);
        root.style.setProperty('--color-text-primary', hexToRgb(text) as string);
        root.style.setProperty('--color-text-secondary', hexToRgb(secondary) as string);
        root.style.setProperty('--color-primary', hexToRgb(primary) as string);
        root.style.setProperty('--color-primary-text', hexToRgb(primaryText) as string);
        
        const cardBg = isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)'; // slate-900 with alpha / white with alpha
        const cardSecondaryBg = isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(241, 245, 249, 0.9)'; // slate-800 / slate-100
        const border = isDark ? 'rgba(51, 65, 85, 0.7)' : 'rgba(226, 232, 240, 0.7)'; // slate-700 / slate-200
        
        root.style.setProperty('--color-card', cardBg);
        root.style.setProperty('--color-card-secondary', cardSecondaryBg);
        root.style.setProperty('--color-border', border);
    }, [themePalette, customThemeColors]);

    // --- Data Persistence ---
    const saveUserSession = useCallback(() => {
        if (currentUser) {
            const sessionData = { messages, learningMode, selectedStage, selectedDifficulty };
            localStorage.setItem(`nova-session-${currentUser.username}`, JSON.stringify(sessionData));
        }
        // Save general settings for all users
         const generalSettings = { themePalette, customThemeColors, learningMode, selectedStage, selectedDifficulty };
         localStorage.setItem('nova-settings', JSON.stringify(generalSettings));
    }, [messages, learningMode, selectedStage, selectedDifficulty, currentUser, themePalette, customThemeColors]);

    const loadUserSession = (username: string) => {
        const savedSession = localStorage.getItem(`nova-session-${username}`);
        if (savedSession) {
            const { messages } = JSON.parse(savedSession);
            setMessages(messages || []);
        } else {
            setMessages([]); // Start fresh if no session for this user
        }
    };
    
    useEffect(() => {
        saveUserSession();
    }, [saveUserSession]);

    // --- File & Camera Handlers ---
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const newFiles: UploadedFile[] = files.map(file => ({
            name: file.name,
            type: file.type,
            base64Data: '',
            progress: 0,
        }));
        setUploadedFiles(prev => [...prev, ...newFiles]);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Data = (e.target?.result as string).split(',')[1];
                setUploadedFiles(prev => prev.map(f =>
                    f.name === file.name && f.progress === 0
                        ? { ...f, base64Data, progress: 100 }
                        : f
                ));
            };
            reader.onerror = () => {
                 setUploadedFiles(prev => prev.map(f =>
                    f.name === file.name && f.progress === 0
                        ? { ...f, progress: -1 }
                        : f
                ));
            };
            reader.readAsDataURL(file);
        }
        event.target.value = ''; // Reset file input
    };
    
    const onRemoveFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const onClearAllFiles = () => setUploadedFiles([]);

    const handleCapture = (base64Data: string) => {
        setUploadedFiles(prev => [...prev, {
            name: `capture-${Date.now()}.jpg`,
            type: 'image/jpeg',
            base64Data,
            progress: 100,
        }]);
        setIsCameraOpen(false);
    };

    // --- Core AI Response Handlers ---
    
    const finalizeModelMessage = (modelMessageId: string) => {
        setMessages(prev =>
            prev.map(msg =>
                msg.id === modelMessageId
                    ? { ...msg, isStreaming: false, thinkingMessage: undefined }
                    : msg
            )
        );
    };


    const processStreamedSolutionResponse = async (
        history: ChatMessage[],
        systemInstruction: string,
        modelMessagePlaceholderId: string,
        currentLearningMode: LearningMode
    ) => {
        const stream = generateResponseStream(history, systemInstruction);
        let currentBuffer = '';
        const delimiter = '[NOVA_JSON_SEPARATOR]';

        for await (const chunk of stream) {
            currentBuffer += chunk;
            
            while (currentBuffer.includes(delimiter)) {
                const separatorIndex = currentBuffer.indexOf(delimiter);
                const blockToProcess = currentBuffer.substring(0, separatorIndex);
                currentBuffer = currentBuffer.substring(separatorIndex + delimiter.length);

                const { parsedJson, cleanedPreamble } = parseStreamBlock(blockToProcess);

                setMessages(prev => prev.map(msg => {
                    if (msg.id !== modelMessagePlaceholderId) return msg;
                    
                    let updatedSolution = { ...msg.solution! };
                    let updatedParts = [...msg.parts];
                    
                    // Only append preamble text if not in a strict JSON mode
                    if (cleanedPreamble && (currentLearningMode !== 'solve_direct' && currentLearningMode !== 'solve_final_answer')) {
                       const existingText = (updatedParts[0]?.text || '').replace(/^Đang phân tích.*?\.\.\./, '').trim();
                       updatedParts = [{ text: existingText ? `${existingText}\n${cleanedPreamble}`: cleanedPreamble }];
                    }
                    if (parsedJson) {
                         const existingQuestionIndex = updatedSolution.questions.findIndex(q => q.number === parsedJson.number && q.test_code === parsedJson.test_code);
                         if (existingQuestionIndex > -1) {
                            updatedSolution.questions[existingQuestionIndex] = parsedJson;
                         } else {
                            updatedSolution.questions.push(parsedJson);
                         }
                    }
                    return { ...msg, solution: updatedSolution, parts: updatedParts };
                }));
            }
        }
        // Process any remaining buffer content after the stream ends
        if (currentBuffer.trim()) {
            const { parsedJson, cleanedPreamble } = parseStreamBlock(currentBuffer);
            setMessages(prev => prev.map(msg => {
                 if (msg.id !== modelMessagePlaceholderId) return msg;
                 let updatedSolution = { ...msg.solution! };
                 let updatedParts = [...msg.parts];
                 // Only append preamble text if not in a strict JSON mode
                 if (cleanedPreamble && (currentLearningMode !== 'solve_direct' && currentLearningMode !== 'solve_final_answer')) {
                    const existingText = (updatedParts[0]?.text || '').replace(/^Đang phân tích.*?\.\.\./, '').trim();
                    updatedParts = [{ text: existingText ? `${existingText}\n${cleanedPreamble}`: cleanedPreamble }];
                 }
                 if (parsedJson) {
                    updatedSolution.questions.push(parsedJson);
                 }
                 return { ...msg, solution: updatedSolution, parts: updatedParts };
            }));
        }
    };
    
    const handlePdfProcessing = async (pdfFile: UploadedFile, userQuery: string) => {
        // 1. Setup UI messages
        const userMessageForUI: ChatMessage = {
            role: 'user',
            parts: [{ text: userQuery }],
            pdfAttachment: { name: pdfFile.name, base64Data: pdfFile.base64Data }
        };
        setMessages(prev => [...prev, userMessageForUI]);
        setInput('');
        setUploadedFiles([]);

        const modelMessagePlaceholderId = `model-${Date.now()}`;
        const modelMessagePlaceholder: ChatMessage = {
            id: modelMessagePlaceholderId,
            role: 'model',
            parts: [{ text: `Đang chuẩn bị phân tích tài liệu "${pdfFile.name}"...` }],
            isStreaming: true,
            solution: { questions: [] }
        };
        setMessages(prev => [...prev, modelMessagePlaceholder]);

        try {
            // 2. Process PDF pages into multiple image parts
            const pdfData = atob(pdfFile.base64Data);
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            const numPages = pdf.numPages;
            const imagePartsForAI: Part[] = [];

            const SCALE = 2.0; // Increased scale for higher accuracy
            const JPEG_QUALITY = 0.95; // Increased quality for higher accuracy

            for (let i = 0; i < numPages; i++) {
                const progress = Math.round(((i + 1) / numPages) * 100);
                setMessages(prev => prev.map(msg => msg.id === modelMessagePlaceholderId ? { ...msg, parts: [{ text: `Đang xử lý trang ${i + 1}/${numPages} (${progress}%)` }] } : msg));
                await new Promise(resolve => setTimeout(resolve, 0)); // Yield to event loop for UI update

                const page = await pdf.getPage(i + 1);
                const viewport = page.getViewport({ scale: SCALE });
                
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const context = canvas.getContext('2d');
                if (!context) continue;

                await page.render({ canvasContext: context, viewport: viewport }).promise;
                
                const pageImageBase64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1];
                imagePartsForAI.push({
                    inlineData: { mimeType: 'image/jpeg', data: pageImageBase64 }
                });
            }
            
            setMessages(prev => prev.map(msg => msg.id === modelMessagePlaceholderId ? { ...msg, thinkingMessage: `Đang phân tích tài liệu...`, parts: [] } : msg));

            // 3. Prepare AI request with the prompt and all page images
            const partsForAI: Part[] = [
                { text: userQuery },
                ...imagePartsForAI
            ];
            const historyForAI: ChatMessage[] = [...messages.slice(0, -1), { role: 'user', parts: partsForAI }];
            const systemInstruction = getSystemInstruction(selectedStage, selectedDifficulty, learningMode);

            // Show the "Solve All" button before starting the stream
            setShowSolveAllButton(true);

            // 4. Process the stream
            await processStreamedSolutionResponse(historyForAI, systemInstruction, modelMessagePlaceholderId, learningMode);
            
            // 5. Finalize the message
            finalizeModelMessage(modelMessagePlaceholderId);

        } catch (error: any) {
            setShowSolveAllButton(false);
            const errorMessage = `Lỗi khi xử lý PDF: ${error.message}`;
            setMessages(prev => prev.map(msg => 
                msg.id === modelMessagePlaceholderId 
                    ? { ...msg, parts: [{ text: errorMessage }], isStreaming: false }
                    : msg
            ));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleStandardMessage = async (userQuery: string, files: UploadedFile[]) => {
        const partsForUI: Part[] = userQuery ? [{ text: userQuery }] : [];
        files.forEach(file => {
            partsForUI.push({ inlineData: { mimeType: file.type, data: file.base64Data } });
        });
        const userMessageForUI: ChatMessage = { role: 'user', parts: partsForUI };
        
        const currentHistory = [...messages, userMessageForUI];
        setMessages(currentHistory);
        setInput('');
        setUploadedFiles([]);
        
        let thinkingMessage = files.length > 0 ? "Đang phân tích hình ảnh..." : "Đang phân tích câu hỏi...";

        const modelMessagePlaceholderId = `model-${Date.now()}`;
        const modelMessagePlaceholder: ChatMessage = {
            id: modelMessagePlaceholderId,
            role: 'model',
            parts: [{ text: '' }],
            isStreaming: true,
            thinkingMessage: thinkingMessage,
            // Initialize solution structure if it's a solution-based mode
            ...( (learningMode === 'solve_direct' || learningMode === 'solve_final_answer') && { solution: { questions: [] } })
        };
        setMessages(prev => [...prev, modelMessagePlaceholder]);

        try {
            const systemInstruction = getSystemInstruction(selectedStage, selectedDifficulty, learningMode);
            
            if (learningMode === 'solve_direct') {
                await processStreamedSolutionResponse(currentHistory, systemInstruction, modelMessagePlaceholderId, learningMode);
                finalizeModelMessage(modelMessagePlaceholderId);
            } else {
                // Handle Socratic, Review, and Final Answer modes
                const stream = generateResponseStream(currentHistory, systemInstruction);
                let fullResponseText = '';
                for await (const chunk of stream) {
                    fullResponseText += chunk;
                    setMessages(prev => prev.map(msg => msg.id === modelMessagePlaceholderId ? { ...msg, parts: [{ text: fullResponseText }] } : msg));
                }

                // Post-process for modes that expect a single JSON object (like Final Answers)
                setMessages(prev =>
                  prev.map(msg => {
                    if (msg.id !== modelMessagePlaceholderId) {
                      return msg;
                    }
                    let finalModelMessage: ChatMessage = { ...msg, parts: [{ text: fullResponseText }] };
                    if (learningMode === 'solve_final_answer') {
                      try {
                        const parsedJson = JSON.parse(fullResponseText);
                        if (parsedJson.finalAnswers) {
                          finalModelMessage.finalAnswers = parsedJson.finalAnswers as FinalAnswerSet;
                          finalModelMessage.parts = []; // Clear the raw JSON text
                        }
                      } catch (e) {
                        console.error("Failed to parse Final Answers JSON, showing raw text.", e);
                      }
                    }
                    return { ...finalModelMessage, isStreaming: false };
                  })
                );
            }
        } catch (error: any) {
            const errorMessage = `Lỗi: ${error.message}`;
            setMessages(prev => prev.map(msg => 
                msg.id === modelMessagePlaceholderId 
                    ? { ...msg, parts: [{ text: errorMessage }], isStreaming: false }
                    : msg
            ));
        } finally {
            setIsLoading(false);
        }
    }

    const handleSendMessage = async () => {
        const userQuery = input.trim();
        if (isLoading || (userQuery.length === 0 && uploadedFiles.length === 0)) return;
        
        setShowSolveAllButton(false); // Reset on any new message

        const pdfFile = uploadedFiles.find(f => f.type === 'application/pdf');
        if (pdfFile && userQuery.length === 0) {
            // Prevent sending a PDF without a prompt for it
            return;
        }

        setIsLoading(true);
        const otherFiles = uploadedFiles.filter(f => f.type !== 'application/pdf');

        if (pdfFile && (learningMode === 'solve_direct' || learningMode === 'solve_final_answer')) {
            await handlePdfProcessing(pdfFile, userQuery);
        } else {
            // Handle cases with no PDF, or PDFs in other modes (like Socratic) where we treat it like a big image
            const allFiles = [...otherFiles];
            if(pdfFile) allFiles.push(pdfFile);
            await handleStandardMessage(userQuery, allFiles);
        }
    };

    const handleSolveAll = async () => {
        if (isLoading) return;
        setShowSolveAllButton(false);
        setIsLoading(true);
        await handleStandardMessage("Giải hết tất cả các câu hỏi còn lại trong tài liệu này.", []);
    };
    
    // --- Auth Handlers ---
    const handleLogin = async (username: string, password: string): Promise<void> => {
        // Mock login
        const user = { username };
        localStorage.setItem('currentUser', JSON.stringify(user));
        setCurrentUser(user);
        loadUserSession(username);
        setAppState('start');
    };

    const handleSignup = async (username: string, password: string): Promise<void> => {
       // Mock signup
       await handleLogin(username, password);
    };

    const handleLogout = () => {
        saveUserSession();
        localStorage.removeItem('currentUser');
        setCurrentUser(null);
        setMessages([]);
        setAppState('auth');
    };
    
    const handleClearHistory = () => {
        setMessages([]);
        setShowSolveAllButton(false);
        if (currentUser) {
            localStorage.removeItem(`nova-session-${currentUser.username}`);
        }
    };

    const handleHomeClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setAppState('start');
    };

    // --- Render Logic ---
    const renderContent = () => {
        switch (appState) {
            case 'auth':
                return <AuthScreen 
                    onLoginClick={() => setIsAuthModalOpen(true)}
                    onGuestContinue={() => { setCurrentUser(null); setAppState('start'); }}
                    onChangelogClick={() => setIsChangelogModalOpen(true)}
                />;
            case 'start':
                return <StartScreen
                    currentUser={currentUser}
                    onSelectMode={(mode) => {
                        setLearningMode(mode);
                        setAppState('chat');
                    }}
                />;
            case 'chat':
                return (
                    <div className="flex flex-col h-full">
                        <Header
                            themePalette={themePalette}
                            setThemePalette={setThemePalette}
                            onOpenCustomTheme={() => setIsCustomThemeModalOpen(true)}
                            learningMode={learningMode}
                            setLearningMode={setLearningMode}
                            selectedStage={selectedStage}
                            setSelectedStage={setSelectedStage}
                            selectedDifficulty={selectedDifficulty}
                            setSelectedDifficulty={setSelectedDifficulty}
                            isLoading={isLoading}
                            currentUser={currentUser}
                            onLoginClick={() => setIsAuthModalOpen(true)}
                            onLogout={handleLogout}
                            onHomeClick={handleHomeClick}
                            onClearHistory={handleClearHistory}
                        />
                        <main className="flex-1 overflow-y-auto p-4 md:p-6">
                            <div className="max-w-4xl mx-auto">
                                {messages.length === 0 ? (
                                    <ChatWelcomeScreen currentUser={currentUser} />
                                ) : (
                                    messages.map((msg, index) => (
                                        <ChatMessageComponent key={msg.id || index} message={msg} onViewPdf={setPdfToView} />
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        </main>
                        {showSolveAllButton && (
                            <button
                                onClick={handleSolveAll}
                                disabled={isLoading}
                                className="fixed bottom-24 right-6 z-10 px-4 py-3 bg-primary text-primary-text font-semibold rounded-xl shadow-lg hover:bg-primary-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 animate-fade-in"
                                aria-label="Giải hết tất cả câu hỏi"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>Giải hết</span>
                            </button>
                        )}
                        <ChatInput
                            input={input}
                            setInput={setInput}
                            handleSendMessage={handleSendMessage}
                            handleFileChange={handleFileChange}
                            onOpenCamera={() => setIsCameraOpen(true)}
                            isLoading={isLoading}
                            uploadedFiles={uploadedFiles}
                            onClearAllFiles={onClearAllFiles}
                            onRemoveFile={onRemoveFile}
                            hasPdf={uploadedFiles.some(f => f.type === 'application/pdf')}
                        />
                    </div>
                );
        }
    }
    
    return (
        <div className="h-screen w-screen bg-background text-text-primary font-sans antialiased overflow-hidden">
            {renderContent()}

            {isCameraOpen && <CameraCapture onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
            
            {isCustomThemeModalOpen && (
                <CustomThemeModal
                    isOpen={isCustomThemeModalOpen}
                    onClose={() => setIsCustomThemeModalOpen(false)}
                    initialColors={customThemeColors}
                    defaultColors={DEFAULT_CUSTOM_THEME}
                    onSave={(colors) => {
                        setCustomThemeColors(colors);
                        setThemePalette('custom');
                        setIsCustomThemeModalOpen(false);
                    }}
                />
            )}
            {isAuthModalOpen && (
                 <AuthModal
                    onClose={() => setIsAuthModalOpen(false)}
                    onLogin={handleLogin}
                    onSignup={handleSignup}
                />
            )}
            {isChangelogModalOpen && <ChangelogModal onClose={() => setIsChangelogModalOpen(false)} />}
            {pdfToView && <PdfViewer base64Data={pdfToView} onClose={() => setPdfToView(null)} />}
        </div>
    );
};

export default App;