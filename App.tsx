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

    // --- Handlers ---
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
    
    const handleSendMessage = async () => {
        const userQuery = input.trim();
        const hasPdf = uploadedFiles.some(f => f.type === 'application/pdf');

        if (isLoading || (userQuery.length === 0 && uploadedFiles.length === 0)) return;
        if (hasPdf && userQuery.length === 0) return;

        setIsLoading(true);

        const pdfFile = uploadedFiles.find(f => f.type === 'application/pdf');
        const imageFiles = uploadedFiles.filter(f => f.type !== 'application/pdf');

        // Show user message immediately in the UI
        const userMessageForUI: ChatMessage = {
            role: 'user',
            parts: userQuery ? [{ text: userQuery }] : [],
            pdfAttachment: pdfFile ? { name: pdfFile.name, base64Data: pdfFile.base64Data } : undefined
        };
        imageFiles.forEach(file => {
            userMessageForUI.parts.push({
                inlineData: { mimeType: file.type, data: file.base64Data },
            });
        });
        const currentHistory: ChatMessage[] = [...messages, userMessageForUI];
        setMessages(currentHistory);
        setInput('');
        setUploadedFiles([]);

        // Determine the specific thinking message based on attachments
        let thinkingMessage = "Đang phân tích câu hỏi...";
        if (pdfFile) {
            thinkingMessage = "Đang phân tích tài liệu... việc này có thể mất một chút thời gian.";
        } else if (imageFiles.length > 0) {
            thinkingMessage = "Đang phân tích hình ảnh...";
        }

        // Prepare placeholder for model response
        const modelMessagePlaceholder: ChatMessage = {
            id: `model-${Date.now()}`,
            role: 'model',
            parts: [{ text: '' }],
            isStreaming: true,
            thinkingMessage: thinkingMessage
        };
        setMessages(prev => [...prev, modelMessagePlaceholder]);

        try {
            // Build parts for the actual AI API call
            let userPartsForAI: Part[] = [];
            if (userQuery) {
                userPartsForAI.push({ text: userQuery });
            }
            imageFiles.forEach(file => userPartsForAI.push({
                inlineData: { mimeType: file.type, data: file.base64Data }
            }));
            if (pdfFile) {
                userPartsForAI.push({
                    inlineData: { mimeType: pdfFile.type, data: pdfFile.base64Data }
                });
            }

            // Create the final message history for the AI
            const finalUserMessage: ChatMessage = { role: 'user', parts: userPartsForAI };
            const finalHistory = [...messages, finalUserMessage];
            
            // --- Unified AI Call ---
            const systemInstruction = getSystemInstruction(selectedStage, selectedDifficulty, learningMode);
            const stream = generateResponseStream(finalHistory, systemInstruction);

            if (learningMode === 'solve_direct') {
                setMessages(prev => prev.map(msg =>
                    msg.id === modelMessagePlaceholder.id
                        ? { ...msg, solution: { questions: [] }, parts: [] }
                        : msg
                ));

                let buffer = '';
                const delimiter = '[NOVA_JSON_SEPARATOR]';

                const processStreamBlock = (block: string) => {
                    if (!block) return;
                    const trimmedBlock = block.trim();
                    if (!trimmedBlock) return;

                    const jsonStartIndex = trimmedBlock.indexOf('{');
                    const jsonEndIndex = trimmedBlock.lastIndexOf('}');
                
                    let preambleText = trimmedBlock;
                    let parsedJson: SolvedQuestion | null = null;
                    
                    if (jsonStartIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                        let potentialJson = trimmedBlock.substring(jsonStartIndex, jsonEndIndex + 1);
                        try {
                            // Regex "safety net" to fix common JSON format errors from the AI before parsing.
                            
                            // 1. Fix unquoted single-word answers (A, B, C, D, Đúng, Sai).
                            potentialJson = potentialJson.replace(/"answer":\s*(A|B|C|D|Đúng|Sai)\s*(?=[,}])/g, '"answer": "$1"');
                            
                            // 2. Fix unquoted numeric values for keys that should be strings ("answer", "number").
                            potentialJson = potentialJson.replace(/"(answer|number)":\s*(-?\d+(\.\d+)?)\s*(?=[,}])/g, '"$1": "$2"');
                        
                            // 3. Fix Python-style booleans (True/False) for "isComplete".
                            potentialJson = potentialJson.replace(/"isComplete":\s*(True|False)\s*(?=[,}])/gi, (match, p1) => `"isComplete": ${p1.toLowerCase()}`);
                            
                            parsedJson = JSON.parse(potentialJson) as SolvedQuestion;
                            preambleText = trimmedBlock.substring(0, jsonStartIndex);
                        } catch (e) {
                            // If JSON parsing fails, keep the original block as preamble text
                            parsedJson = null;
                            preambleText = trimmedBlock;
                        }
                    }
                    
                    const cleanedPreamble = preambleText
                        .replace(/(?:via-\s*)?(?:```(?:json)?|`json|"json|json)\s*$/i, '')
                        .trim();
                
                    if (cleanedPreamble) {
                        setMessages(prev => prev.map(msg => {
                            if (msg.id === modelMessagePlaceholder.id) {
                                const newParts = [...(msg.parts || [])];
                                const lastPart = newParts[newParts.length - 1];
                                if (lastPart && lastPart.text !== undefined) {
                                     lastPart.text += (lastPart.text ? '\n' : '') + cleanedPreamble;
                                } else {
                                    newParts.push({ text: cleanedPreamble });
                                }
                                return { ...msg, parts: newParts };
                            }
                            return msg;
                        }));
                    }
                    
                    if (parsedJson) {
                        const newQuestion = parsedJson;
                        setMessages(prev => prev.map(msg => {
                            if (msg.id === modelMessagePlaceholder.id && msg.solution) {
                                const questions = msg.solution.questions;
                                const existingQuestionIndex = questions.findIndex(q => q.number === newQuestion.number && q.test_code === newQuestion.test_code);
                                
                                let updatedQuestions;
                                if (existingQuestionIndex > -1) {
                                    updatedQuestions = [...questions];
                                    updatedQuestions[existingQuestionIndex] = newQuestion;
                                } else {
                                    updatedQuestions = [...questions, newQuestion];
                                }
                                return { ...msg, solution: { ...msg.solution, questions: updatedQuestions } };
                            }
                            return msg;
                        }));
                    }
                };
            
                for await (const chunk of stream) {
                    buffer += chunk;
                    const parts = buffer.split(delimiter);
                    if (parts.length > 1) {
                        for (let i = 0; i < parts.length - 1; i++) {
                            processStreamBlock(parts[i]);
                        }
                        buffer = parts[parts.length - 1];
                    }
                }
                // Process any remaining data in the buffer
                processStreamBlock(buffer);
            } else {
                 // --- Standard Text & Single JSON Streaming Logic ---
                let fullResponseText = '';
                for await (const chunk of stream) {
                    fullResponseText += chunk;
                    setMessages(prev => prev.map(msg =>
                        msg.id === modelMessagePlaceholder.id
                            ? { ...msg, parts: [{ text: fullResponseText }] }
                            : msg
                    ));
                }

                let finalModelMessage: ChatMessage = { ...modelMessagePlaceholder };
                try {
                    const findJsonBlock = (text: string): { json: string | null, remaining: string } => {
                        const startIndex = text.indexOf('{');
                        if (startIndex === -1) return { json: null, remaining: text };
                        let braceCount = 0;
                        let endIndex = -1;
                        for (let i = startIndex; i < text.length; i++) {
                            if (text[i] === '{') braceCount++;
                            else if (text[i] === '}') braceCount--;
                            if (braceCount === 0) {
                                endIndex = i;
                                break;
                            }
                        }
                        if (endIndex !== -1) {
                            const jsonStr = text.substring(startIndex, endIndex + 1);
                            const remainingStr = text.substring(0, startIndex) + text.substring(endIndex + 1);
                            return { json: jsonStr, remaining: remainingStr.trim() };
                        }
                        return { json: null, remaining: text };
                    };
                    const { json: jsonString, remaining: remainingText } = findJsonBlock(fullResponseText);

                    if (jsonString) {
                        const parsedJson = JSON.parse(jsonString);
                        finalModelMessage.parts = remainingText ? [{ text: remainingText }] : [];
                        if (parsedJson.solution) finalModelMessage.solution = parsedJson.solution as { questions: SolvedQuestion[] };
                        if (parsedJson.finalAnswers) finalModelMessage.finalAnswers = parsedJson.finalAnswers as FinalAnswerSet;
                        if (!parsedJson.solution && !parsedJson.finalAnswers) finalModelMessage.parts = [{ text: fullResponseText }];
                    } else {
                        finalModelMessage.parts = [{ text: fullResponseText }];
                    }
                } catch (e) {
                    console.error("Failed to parse JSON from stream, treating as plain text.", e, "Full text:", fullResponseText);
                    finalModelMessage.parts = [{ text: fullResponseText }];
                }
                setMessages(prev => prev.map(msg => msg.id === modelMessagePlaceholder.id ? { ...finalModelMessage, isStreaming: false } : msg));
            }
            
            // Mark message as complete
            setMessages(prev => prev.map(msg =>
                msg.id === modelMessagePlaceholder.id
                    ? { ...msg, isStreaming: false }
                    : msg
            ));
        } catch (error: any) {
            const errorMessage = `Lỗi: ${error.message}`;
            setMessages(prev => prev.map(msg => 
                msg.id === modelMessagePlaceholder.id 
                    ? { ...msg, parts: [{ text: errorMessage }], isStreaming: false }
                    : msg
            ));
        } finally {
            setIsLoading(false);
        }
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