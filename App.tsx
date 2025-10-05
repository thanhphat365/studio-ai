import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatInput from './components/ChatInput';
import ChatMessageComponent from './components/ChatMessage';
import Header from './components/Header';
import { EducationalStage, DifficultyLevel, ChatMessage, UploadedFile, Part, LearningMode, ThemePalette, User, CustomThemeColors, SolvedQuestion, FinalAnswerSet, FinalAnswer } from './types';
import { generateResponseStream, generateImage } from './services/geminiService';
import ChatWelcomeScreen from './components/ChatWelcomeScreen';
import CameraCapture from './components/CameraCapture';
import AuthModal from './components/AuthModal';
import AuthScreen from './components/AuthScreen';
import ChangelogModal from './components/ChangelogModal';
import CustomThemeModal from './components/CustomThemeModal';
import { hexToRgb } from './utils/color';

const fileToBase64WithProgress = (file: File, onProgress: (percent: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentLoaded = Math.round((event.loaded / event.total) * 100);
                // Clamp progress to 99 before it's fully loaded to avoid visual glitches
                onProgress(percentLoaded < 100 ? percentLoaded : 99);
            }
        };
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            onProgress(100);
            resolve(base64Data);
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsDataURL(file);
    });
};

const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

const isTextFile = (file: File): boolean => {
  const textMimeTypes = ['text/plain', 'text/markdown', 'text/csv'];
  const textExtensions = ['.txt', '.md', '.csv'];
  if (textMimeTypes.includes(file.type)) {
      return true;
  }
  return textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
};


const DEFAULT_CUSTOM_THEME: CustomThemeColors = {
  background: '#f8fafc', // slate-50
  text: '#0f172a',       // slate-900
  primary: '#4f46e5',    // indigo-600
};

const App: React.FC = () => {
  const [appFlowState, setAppFlowState] = useState<'auth' | 'chat'>('auth');
  const [learningMode, setLearningMode] = useState<LearningMode>('solve_socratic');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [educationalStage, setEducationalStage] = useState<EducationalStage>(EducationalStage.MiddleSchool);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(DifficultyLevel.Basic);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileParts, setFileParts] = useState<Part[] | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [themePalette, setThemePalette] = useState<ThemePalette>(() => (localStorage.getItem('theme_palette') as ThemePalette) || 'default');
  const [customThemeColors, setCustomThemeColors] = useState<CustomThemeColors>(DEFAULT_CUSTOM_THEME);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [isCustomThemeModalOpen, setIsCustomThemeModalOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom effect
  useEffect(() => {
    if (appFlowState === 'chat') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, appFlowState]);
  
  // Theme management effect
  useEffect(() => {
    const root = window.document.documentElement;
    root.style.cssText = ''; // Clear previous custom styles
    root.removeAttribute('data-theme');
    root.classList.remove('dark');

    if (themePalette === 'custom') {
        const bgRgb = hexToRgb(customThemeColors.background);
        const textRgb = hexToRgb(customThemeColors.text);
        const primaryRgb = hexToRgb(customThemeColors.primary);
        
        if (bgRgb && textRgb && primaryRgb) {
            // A simple heuristic for dark mode based on background luminance
            const bgLuminance = (0.299 * parseInt(bgRgb.split(' ')[0]) + 0.587 * parseInt(bgRgb.split(' ')[1]) + 0.114 * parseInt(bgRgb.split(' ')[2])) / 255;
            const isDark = bgLuminance < 0.5;

            // Base colors
            root.style.setProperty('--color-background', bgRgb);
            root.style.setProperty('--color-text-primary', textRgb);
            root.style.setProperty('--color-primary', primaryRgb);
            
            // Derived colors (simplified)
            root.style.setProperty('--color-card', isDark ? '15 23 42' : '255 255 255');
            // FIX: Corrected RGB value for slate-100 from '241 245 29' to '241 245 249'.
            root.style.setProperty('--color-card-secondary', isDark ? '30 41 59' : '241 245 249');
            root.style.setProperty('--color-border', isDark ? '51 65 85' : '226 232 240');
            root.style.setProperty('--color-text-secondary', isDark ? '148 163 184' : '51 65 85');
            root.style.setProperty('--color-primary-hover', primaryRgb); // Can be improved
            root.style.setProperty('--color-primary-text', isDark ? '15 23 42' : '255 255 255');
        }
    } else if (themePalette === 'default') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.toggle('dark', systemTheme === 'dark');
    } else {
        root.setAttribute('data-theme', themePalette);
    }
    
    localStorage.setItem('theme_palette', themePalette);
  }, [themePalette, customThemeColors]);

  // Auth: Check for logged-in user on initial load
  useEffect(() => {
    const loggedInUser = localStorage.getItem('nova_currentUser');
    if (loggedInUser) {
        setCurrentUser({ username: loggedInUser });
    }
  }, []);

  // Auth: Load user data on login, reset on logout
  useEffect(() => {
    if (currentUser) {
        // Load settings
        const settingsRaw = localStorage.getItem(`nova_settings_${currentUser.username}`);
        if (settingsRaw) {
            const { stage, difficulty, learningMode: savedMode, theme, customTheme } = JSON.parse(settingsRaw);
            setEducationalStage(stage || EducationalStage.MiddleSchool);
            setDifficultyLevel(difficulty || DifficultyLevel.Basic);
            setLearningMode(savedMode || 'solve_socratic');
            setThemePalette(theme || 'default');
            setCustomThemeColors(customTheme || DEFAULT_CUSTOM_THEME);
        } else {
            // Reset to defaults if no settings found
            setEducationalStage(EducationalStage.MiddleSchool);
            setDifficultyLevel(DifficultyLevel.Basic);
            setLearningMode('solve_socratic');
            setThemePalette('default');
            setCustomThemeColors(DEFAULT_CUSTOM_THEME);
        }

        const chatHistoryRaw = localStorage.getItem(`nova_chat_${currentUser.username}`);
        setMessages(chatHistoryRaw ? JSON.parse(chatHistoryRaw) : []);
        setAppFlowState('chat');
    } else {
        // Reset app state on logout
        setMessages([]);
        setLearningMode('solve_socratic');
        setEducationalStage(EducationalStage.MiddleSchool);
        setDifficultyLevel(DifficultyLevel.Basic);
    }
  }, [currentUser]);

  // Auth: Save chat history
  useEffect(() => {
    if (currentUser && appFlowState === 'chat' && messages.length > 0) {
        const isStreaming = messages[messages.length - 1]?.isStreaming;
        if (!isStreaming) {
            localStorage.setItem(`nova_chat_${currentUser.username}`, JSON.stringify(messages));
        }
    }
  }, [messages, currentUser, appFlowState]);

  // Auth: Save user settings
  useEffect(() => {
    if (currentUser) {
        const settings = { 
            stage: educationalStage, 
            difficulty: difficultyLevel, 
            learningMode: learningMode,
            theme: themePalette,
            customTheme: customThemeColors
        };
        localStorage.setItem(`nova_settings_${currentUser.username}`, JSON.stringify(settings));
    }
  }, [educationalStage, difficultyLevel, learningMode, themePalette, customThemeColors, currentUser]);

  const handleSignup = async (username: string, password: string) => {
    const usersRaw = localStorage.getItem('nova_users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    if (users.some((user: any) => user.username === username)) {
        throw new Error('Tên đăng nhập đã tồn tại.');
    }
    users.push({ username, password });
    localStorage.setItem('nova_users', JSON.stringify(users));
    await handleLogin(username, password);
  };

  const handleLogin = async (username: string, password: string) => {
    const usersRaw = localStorage.getItem('nova_users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    const user = users.find((u: any) => u.username === username);
    if (!user || user.password !== password) {
        throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
    localStorage.setItem('nova_currentUser', username);
    setCurrentUser({ username });
  };

  const handleLogout = () => {
    localStorage.removeItem('nova_currentUser');
    setCurrentUser(null);
    setAppFlowState('auth');
  };
  
  const handleSaveCustomTheme = (newColors: CustomThemeColors) => {
    setCustomThemeColors(newColors);
    setThemePalette('custom');
    setIsCustomThemeModalOpen(false);
  };

  const handleClearHistory = () => {
    if (!currentUser) return;
    const isConfirmed = window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện không? Hành động này không thể hoàn tác.');
    if (isConfirmed) {
        setMessages([]);
        localStorage.removeItem(`nova_chat_${currentUser.username}`);
    }
  };

  const handleHomeClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (messages.length > 0) {
        const confirmed = window.confirm('Bạn có chắc muốn bắt đầu một cuộc trò chuyện mới không? Lịch sử hiện tại sẽ được xóa.');
        if (!confirmed) {
            return;
        }
      }
      setMessages([]);
      setFileParts(null);
      setUploadedFiles([]);
      setError(null);
      setInput('');
      if (currentUser) {
        localStorage.removeItem(`nova_chat_${currentUser.username}`);
      }
  };

  const handleClearAllFiles = () => {
    setUploadedFiles([]);
    setFileParts(null);
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setFileParts(prev => prev ? prev.filter((_, index) => index !== indexToRemove) : null);
  };

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (appFlowState !== 'chat' || isLoading || isCameraOpen) return;

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
                const base64Data = await fileToBase64WithProgress(imageFile, () => {}); // No-op progress
                newUploadedFiles.push({ name: `Pasted_Image_${Date.now()}`, type: imageFile.type, base64Data });
                newFileParts.push({ inlineData: { mimeType: imageFile.type, data: base64Data } });
            }
            setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
            setFileParts(prev => [...(prev || []), ...newFileParts]);
        } catch (err) {
            setError('Lỗi xử lý ảnh dán. Vui lòng thử lại.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }
  }, [appFlowState, isLoading, isCameraOpen]);


  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
        window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsLoading(true);
    setError(null);

    const startIndex = uploadedFiles.length;
    const newUploads: UploadedFile[] = files.map((file: File) => ({
        name: file.name,
        type: file.type,
        base64Data: '',
        progress: 0,
    }));
    setUploadedFiles(prev => [...prev, ...newUploads]);

    const processingErrors: string[] = [];
    const processingPromises = files.map(async (file: File, index) => {
        const fileIndexInState = startIndex + index;

        const onProgress = (percent: number) => {
            setUploadedFiles(prev => prev.map((f, i) => i === fileIndexInState ? { ...f, progress: percent } : f));
        };

        try {
            const newParts: Part[] = [];
            let finalBase64Data = '';

            if (file.type === 'application/pdf') {
                const pdfjsLib = (window as any).pdfjsLib;
                if (!pdfjsLib) throw new Error("Thư viện PDF.js chưa được tải.");
                
                const arrayBuffer = await file.arrayBuffer();
                onProgress(10);
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                onProgress(20);

                const canvas = document.createElement('canvas');
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    
                    const pageAsImage = canvas.toDataURL('image/jpeg', 0.9);
                    const pageBase64 = pageAsImage.split(',')[1];
                    newParts.push({ inlineData: { mimeType: 'image/jpeg', data: pageBase64 } });
                    onProgress(20 + Math.round((i / pdf.numPages) * 80));
                }
                canvas.remove();
            
            } else if (isTextFile(file)) {
                onProgress(50);
                const textContent = await fileToText(file);
                if (textContent.trim()) {
                    newParts.push({ text: `--- Nội dung từ tệp "${file.name}" ---\n${textContent}` });
                }
                onProgress(100);

            } else if (file.type.startsWith('image/')) { 
                finalBase64Data = await fileToBase64WithProgress(file, onProgress);
                newParts.push({ inlineData: { mimeType: file.type, data: finalBase64Data } });
            } else {
                throw new Error(`Loại tệp không được hỗ trợ: ${file.name}`);
            }

            if (newParts.length > 0) {
              setFileParts(prev => [...(prev || []), ...newParts]);
            }
            
            setUploadedFiles(prev => prev.map((f, i) => 
                i === fileIndexInState ? { ...f, base64Data: finalBase64Data, progress: undefined } : f
            ));

        } catch (err: any) {
            console.error(`Error processing ${file.name}:`, err);
            processingErrors.push(file.name);
            setUploadedFiles(prev => prev.map((f, i) => i === fileIndexInState ? { ...f, progress: -1 } : f));
        }
    });

    await Promise.all(processingPromises);

    if (processingErrors.length > 0) {
        setError(`Lỗi khi xử lý các tệp sau: ${processingErrors.join(', ')}`);
    }

    setIsLoading(false); 
    if (event.target) {
        (event.target as HTMLInputElement).value = '';
    }
  };
  
  const handlePhotoTaken = (base64Data: string) => {
    const newFile = { name: `Snapshot_${Date.now()}.jpg`, type: 'image/jpeg', base64Data };
    const newPart = { inlineData: { mimeType: 'image/jpeg', data: base64Data } };
    setUploadedFiles(prev => [...prev, newFile]);
    setFileParts(prev => [...(prev || []), newPart]);
    setIsCameraOpen(false);
  };
  
  const processRegularStream = async (stream: AsyncGenerator<string>, modelMessageIndex: number) => {
    const imageGenRegex = /\[GENERATE_IMAGE:\s*"([^"]+)"\]/g;
    let unprocessedText = '';

    for await (const chunk of stream) {
        unprocessedText += chunk;
        setMessages(prev => {
            const newMessages = [...prev];
            if (modelMessageIndex >= newMessages.length) return prev;
            
            const updatedMessage = { ...newMessages[modelMessageIndex], parts: [...newMessages[modelMessageIndex].parts], isStreaming: true };
            
            const textPartIndex = updatedMessage.parts.findIndex(p => p.text !== undefined);
            if (textPartIndex !== -1) {
                updatedMessage.parts[textPartIndex].text = (updatedMessage.parts[textPartIndex].text || '') + chunk;
            } else {
                updatedMessage.parts.unshift({ text: chunk });
            }
            newMessages[modelMessageIndex] = updatedMessage;
            return newMessages;
        });

        let match;
        let lastIndex = 0;
        while ((match = imageGenRegex.exec(unprocessedText)) !== null) {
            const prompt = match[1];
            generateImage(prompt).then(base64Image => {
                const imagePart: Part = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
                setMessages(prev => {
                    const updatedMessages = [...prev];
                    if (modelMessageIndex >= updatedMessages.length) return prev;
                    const msgToUpdate = { ...updatedMessages[modelMessageIndex], parts: [...updatedMessages[modelMessageIndex].parts] };
                    if (!msgToUpdate.parts.some(p => p.inlineData?.data === base64Image)) {
                        msgToUpdate.parts.push({ text: "Đây là hình ảnh minh họa thầy đã tạo:" }, imagePart);
                    }
                    updatedMessages[modelMessageIndex] = msgToUpdate;
                    return updatedMessages;
                });
            }).catch(e => console.error("Failed to generate image from stream:", e));
            lastIndex = match.index + match[0].length;
        }
        unprocessedText = unprocessedText.substring(lastIndex);
    }
    
    setMessages(prev => {
        const finalMessages = [...prev];
        if (modelMessageIndex >= finalMessages.length) return prev;
        
        const finalModelMessage = { ...finalMessages[modelMessageIndex] };
        const newParts = finalModelMessage.parts.map(p => ({...p}));
        
        const textPartIndex = newParts.findIndex(p => p.text !== undefined);
        if (textPartIndex !== -1 && newParts[textPartIndex].text) {
            newParts[textPartIndex].text = (newParts[textPartIndex].text || '').replace(imageGenRegex, '').trim();
        }
        
        finalMessages[modelMessageIndex] = { ...finalModelMessage, parts: newParts, isStreaming: false };
        return finalMessages;
    });
  };

    const processSolutionStream = async (stream: AsyncGenerator<string>, modelMessageIndex: number, isAppending: boolean) => {
        let questionsForThisPage: SolvedQuestion[] = [];
        let currentQuestion: SolvedQuestion | null = null;
        let currentTag: 'steps' | 'answer' | null = null;
        let tagBuffer = "";

        const updateState = (isStreaming: boolean) => {
             setMessages(prev => {
                const newMessages = [...prev];
                const modelMessage = newMessages[modelMessageIndex];
                if (!modelMessage) return prev;
                
                if (!modelMessage.solution) {
                    modelMessage.solution = { questions: [] };
                }

                // Get questions from other pages by filtering out questions that are on this page
                const numbersOnThisPage = new Set(questionsForThisPage.map(q => q.number));
                const questionsFromOtherPages = isAppending 
                    ? modelMessage.solution.questions.filter(q => !numbersOnThisPage.has(q.number))
                    : [];

                // Combine them
                const finalQuestions = [...questionsFromOtherPages, ...questionsForThisPage];

                // Create a new modelMessage object to ensure re-render
                const newModelMessage = {
                    ...modelMessage,
                    isStreaming: isStreaming,
                    solution: {
                        ...modelMessage.solution,
                        questions: finalQuestions,
                    }
                };
                newMessages[modelMessageIndex] = newModelMessage;
                return newMessages;
            });
        };

        for await (const chunk of stream) {
            for (const char of chunk) {
                if (char === '<') {
                    tagBuffer = "<";
                } else if (char === '>' && tagBuffer.startsWith('<')) {
                    tagBuffer += ">";
                    const tagContent = tagBuffer.slice(1, -1).trim();
                    const isClosing = tagContent.startsWith('/');
                    const [tagName, ...attrs] = (isClosing ? tagContent.slice(1) : tagContent).split(' ');
                    
                    if (tagName === 'question') {
                        if (isClosing) {
                            if (currentQuestion) {
                                currentQuestion.isComplete = true;
                                currentQuestion = null;
                            }
                        } else {
                            if (currentQuestion) {
                                currentQuestion.isComplete = true;
                            }
                            const numberAttr = attrs.join(' ').match(/number="([^"]+)"/);
                            const number = numberAttr ? numberAttr[1] : (questionsForThisPage.length + 1).toString();
                            currentQuestion = { number, steps: '', answer: '', isComplete: false };
                            questionsForThisPage.push(currentQuestion);
                        }
                    } else if (tagName === 'steps' || tagName === 'answer') {
                        currentTag = isClosing ? null : tagName;
                    }
                    
                    tagBuffer = "";
                } else if (tagBuffer.length > 0) {
                    tagBuffer += char;
                } else {
                    if (currentQuestion && currentTag) {
                        if (currentTag === 'steps') {
                            currentQuestion.steps += char;
                        } else if (currentTag === 'answer') {
                            currentQuestion.answer += char;
                        }
                    }
                }
            }
            updateState(true);
        }

        setMessages(prev => {
            const finalMessages = [...prev];
            const modelMessage = finalMessages[modelMessageIndex];
            if (modelMessage && modelMessage.solution) {
                const finalQuestions = modelMessage.solution.questions.map(q => ({...q, isComplete: true}));
                finalMessages[modelMessageIndex] = {
                    ...modelMessage,
                    isStreaming: false,
                    solution: {
                        ...modelMessage.solution,
                        questions: finalQuestions,
                    }
                };
            }
            return finalMessages;
        });
    };

    const processFinalAnswerStream = async (stream: AsyncGenerator<string>, modelMessageIndex: number, isAppending: boolean) => {
        let answersForThisPage: FinalAnswer[] = [];
        let currentAnswer: FinalAnswer | null = null;
        let currentTag: 'answer' | null = null;
        let tagBuffer = "";

        const updateState = (isStreaming: boolean) => {
             setMessages(prev => {
                const newMessages = [...prev];
                const modelMessage = newMessages[modelMessageIndex];
                if (!modelMessage) return prev;

                if (!modelMessage.finalAnswers) {
                     modelMessage.finalAnswers = { title: 'Bảng Đáp Án', answers: [] };
                }
                
                const numbersOnThisPage = new Set(answersForThisPage.map(a => a.number));
                const answersFromOtherPages = isAppending 
                    ? modelMessage.finalAnswers.answers.filter(a => !numbersOnThisPage.has(a.number))
                    : [];

                const finalAnswers = [...answersFromOtherPages, ...answersForThisPage];
                
                const newModelMessage = {
                    ...modelMessage,
                    isStreaming: isStreaming,
                    finalAnswers: {
                        ...modelMessage.finalAnswers,
                        answers: finalAnswers,
                    }
                };
                
                newMessages[modelMessageIndex] = newModelMessage;
                return newMessages;
            });
        };

        for await (const chunk of stream) {
            for (const char of chunk) {
                if (char === '<') {
                    tagBuffer = "<";
                } else if (char === '>' && tagBuffer.startsWith('<')) {
                    tagBuffer += ">";
                    const tagContent = tagBuffer.slice(1, -1).trim();
                    const isClosing = tagContent.startsWith('/');
                    const [tagName, ...attrs] = (isClosing ? tagContent.slice(1) : tagContent).split(' ');
                    
                    if (tagName === 'answer') {
                        if (isClosing) {
                           if (currentAnswer) {
                               const existingIndex = answersForThisPage.findIndex(a => a.number === currentAnswer!.number);
                               if (existingIndex !== -1) {
                                   answersForThisPage[existingIndex] = currentAnswer;
                               } else {
                                   answersForThisPage.push(currentAnswer);
                               }
                           }
                           currentAnswer = null;
                           currentTag = null;
                        } else {
                            const numberAttr = attrs.join(' ').match(/number="([^"]+)"/);
                            const number = numberAttr ? numberAttr[1] : `Câu ${answersForThisPage.length + 1}`;
                            currentAnswer = { number, answer: '' };
                            currentTag = 'answer';
                        }
                    }
                    tagBuffer = "";
                } else if (tagBuffer.length > 0) {
                    tagBuffer += char;
                } else {
                    if (currentAnswer && currentTag === 'answer') {
                       currentAnswer.answer += char;
                    }
                }
            }
            updateState(true);
        }
        updateState(false);
    };

    const processSingleRequest = async (messagesToSend: ChatMessage[], mode: LearningMode) => {
        const modelMessageShell: ChatMessage = {
            id: `model-${Date.now()}`, role: 'model', parts: [], isStreaming: true
        };
        if (mode === 'solve_direct') {
            modelMessageShell.solution = { questions: [] };
        } else if (mode === 'solve_final_answer') {
            modelMessageShell.finalAnswers = { title: 'Bảng Đáp Án', answers: [] };
        }
        
        const messagesWithShell = [...messages, modelMessageShell];
        const modelMessageIndex = messagesWithShell.length - 1;
        setMessages(messagesWithShell);

        try {
            const stream = generateResponseStream(messagesToSend, educationalStage, difficultyLevel, mode);
            if (mode === 'solve_direct') {
                await processSolutionStream(stream, modelMessageIndex, false);
            } else if (mode === 'solve_final_answer') {
                await processFinalAnswerStream(stream, modelMessageIndex, false);
            }
            else {
                await processRegularStream(stream, modelMessageIndex);
            }
        } catch (err: any) {
             console.error("API call failed:", err);
            const errorMsg = 'Đã có lỗi xảy ra khi giao tiếp với AI. Vui lòng thử lại sau.';
            setError(errorMsg);
            setMessages(prev => {
                const updatedMessages = [...prev];
                if (updatedMessages[modelMessageIndex]) {
                    updatedMessages[modelMessageIndex].parts = [{ text: errorMsg }];
                    updatedMessages[modelMessageIndex].isStreaming = false;
                }
                return updatedMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const processMultiPageRequest = async (pages: Part[], userPrompt: string, mode: LearningMode) => {
        const modelMessageShell: ChatMessage = {
            id: `model-${Date.now()}`, role: 'model', parts: [], isStreaming: true
        };
         if (mode === 'solve_final_answer') {
            modelMessageShell.finalAnswers = { title: 'Bảng Đáp Án', answers: [] };
        } else if (mode === 'solve_direct') {
            modelMessageShell.solution = { questions: [] };
        }

        const initialMessages = [...messages];
        const modelMessageIndex = initialMessages.length + 1; // +1 for the user message
        setMessages(prev => [...prev, {id: `user-${Date.now()}`, role: 'user', parts: [...pages, {text: userPrompt}]}, modelMessageShell]);

        try {
            for (let i = 0; i < pages.length; i++) {
                const currentPagePart = pages[i];
                const pagePrompt = userPrompt ? `${userPrompt} (Trang ${i + 1}/${pages.length})` : `Đây là trang ${i + 1}/${pages.length}.`;
                
                setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[modelMessageIndex]) {
                        newMessages[modelMessageIndex].parts = [{ text: `Đang xử lý trang ${i + 1}/${pages.length}...` }];
                    }
                    return newMessages;
                });
                
                const singlePageMessage: ChatMessage[] = [{ role: 'user', parts: [{ text: pagePrompt }, currentPagePart] }];
                const stream = generateResponseStream(singlePageMessage, educationalStage, difficultyLevel, mode);

                if (mode === 'solve_final_answer') {
                    await processFinalAnswerStream(stream, modelMessageIndex, true);
                } else if (mode === 'solve_direct') {
                    await processSolutionStream(stream, modelMessageIndex, true);
                } else {
                    await processRegularStream(stream, modelMessageIndex);
                }
            }
        } catch (err: any) {
            console.error("Multi-page API call failed:", err);
            const errorMsg = 'Đã có lỗi xảy ra trong quá trình xử lý tài liệu. Vui lòng thử lại.';
            setError(errorMsg);
            setMessages(prev => {
                const updatedMessages = [...prev];
                if (updatedMessages[modelMessageIndex]) {
                    updatedMessages[modelMessageIndex].parts = [{ text: errorMsg }];
                }
                return updatedMessages;
            });
        } finally {
            setMessages(prev => {
                const finalMessages = [...prev];
                if (finalMessages[modelMessageIndex]) {
                    finalMessages[modelMessageIndex].isStreaming = false;
                    finalMessages[modelMessageIndex].parts = []; // Clear "Processing..." message
                }
                return finalMessages;
            });
            setIsLoading(false);
        }
    };
  
    const handleSendMessage = async () => {
        if (isLoading || (!input.trim() && !fileParts)) return;
    
        setIsLoading(true);
        setError(null);
    
        const currentFileParts = fileParts || [];
        const currentInput = input;
    
        // Reset inputs immediately for responsive UI
        setInput('');
        setUploadedFiles([]);
        setFileParts(null);
    
        // Decide processing strategy
        const isMultiPage = currentFileParts.length > 1;
        const isStructuredMode = learningMode === 'solve_final_answer' || learningMode === 'solve_direct';
    
        if (isStructuredMode && isMultiPage) {
            await processMultiPageRequest(currentFileParts, currentInput, learningMode);
        } else {
            const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', parts: [] };
            if (currentFileParts) userMessage.parts.push(...currentFileParts);
            if (currentInput.trim()) userMessage.parts.push({ text: currentInput });
            const newMessages = [...messages, userMessage];
            
            await processSingleRequest(newMessages, learningMode);
        }
    };
  
  if (isCameraOpen) {
    return <CameraCapture onCapture={handlePhotoTaken} onClose={() => setIsCameraOpen(false)} />;
  }
  
  return (
    <div className="flex flex-col h-screen bg-background font-sans text-text-primary">
      
      {appFlowState === 'auth' && (
        <AuthScreen
          onLoginClick={() => setIsAuthModalOpen(true)}
          onGuestContinue={() => {
              setCurrentUser(null);
              setAppFlowState('chat');
          }}
          onChangelogClick={() => setIsChangelogModalOpen(true)}
        />
      )}
      
      {appFlowState === 'chat' && (
        <>
          <Header
            themePalette={themePalette}
            setThemePalette={setThemePalette}
            onOpenCustomTheme={() => setIsCustomThemeModalOpen(true)}
            learningMode={learningMode}
            setLearningMode={setLearningMode}
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
              <div className="max-w-4xl mx-auto h-full">
                  {messages.length === 0 ? (
                     <ChatWelcomeScreen currentUser={currentUser} />
                  ) : (
                    messages.map((msg, index) => (
                      <ChatMessageComponent key={msg.id || index} message={msg} />
                    ))
                  )}
                  {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                    <ChatMessageComponent message={{ id: 'loading', role: 'model', parts: [], isStreaming: true }} />
                  )}
                  {error && (
                    <div className="text-red-500 text-center p-2">{error}</div>
                  )}
                  <div ref={chatEndRef} />
              </div>
          </main>
          <footer className="w-full">
            <ChatInput
              input={input}
              setInput={setInput}
              handleSendMessage={handleSendMessage}
              handleFileChange={handleFileChange}
              onOpenCamera={() => setIsCameraOpen(true)}
              isLoading={isLoading}
              uploadedFiles={uploadedFiles}
              onClearAllFiles={handleClearAllFiles}
              onRemoveFile={handleRemoveFile}
            />
          </footer>
        </>
      )}

      {isAuthModalOpen && (
          <AuthModal
              onClose={() => setIsAuthModalOpen(false)}
              onLogin={async (username, password) => {
                  await handleLogin(username, password);
                  setIsAuthModalOpen(false);
              }}
              onSignup={async (username, password) => {
                  await handleSignup(username, password);
                  setIsAuthModalOpen(false);
              }}
          />
      )}
      
      {isCustomThemeModalOpen && (
        <CustomThemeModal
          isOpen={isCustomThemeModalOpen}
          onClose={() => setIsCustomThemeModalOpen(false)}
          onSave={handleSaveCustomTheme}
          initialColors={customThemeColors}
          defaultColors={DEFAULT_CUSTOM_THEME}
        />
      )}

      {isChangelogModalOpen && (
        <ChangelogModal onClose={() => setIsChangelogModalOpen(false)} />
      )}

    </div>
  );
};

export default App;