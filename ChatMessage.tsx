import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, Part, SolvedQuestion, FinalAnswerSet, SolvedPart, FinalAnswer } from '../types';
import { NovaIcon, CheckCircleIcon, ChevronDownIcon, DocumentTextIcon } from './Icons';

const parseMarkdown = (text: string) => {
    if (!text) return { __html: '' };

    // 1. Unescape newlines from AI's JSON string format
    let processedText = text.replace(/\\n/g, '\n');
    
    // 2. Remove stray backslashes that AI uses for line breaks. This often happens before a newline or at the end of the text.
    processedText = processedText.replace(/\\(?=\s*(\n|$))/g, '');

    // 3. Proactively correct common LaTeX errors & normalize backslashes.
    // The AI might send `frac`, `\\frac` (becomes `\frac` after JSON parse), or `\\\\frac` (becomes `\\frac` after JSON parse).
    // We want to ensure the final output for MathJax is always `\command`.
    const applyLatexFixes = (mathContent: string): string => {
        // First, normalize multiple backslashes down to one. E.g., `\\frac` -> `\frac`.
        let fixedContent = mathContent.replace(/\\+(\w+)/g, '\\$1');
        
        const latexCommands = [
            'frac', 'sqrt', 'sum', 'int', 'lim', 'log', 'ln', 'sin', 'cos', 'tan',
            'alpha', 'beta', 'gamma', 'delta', 'pi', 'theta', 'sigma', 'omega',
            'Delta', 'Pi', 'Theta', 'Sigma', 'Omega',
            'pm', 'mp', 'times', 'div', 'cdot', 'cap', 'cup', 'in', 'ni',
            'subset', 'supset', 'subseteq', 'supseteq', 'equiv', 'approx', 'neq', 'leq', 'geq',
            'rightarrow', 'leftarrow', 'leftrightarrow', 'uparrow', 'downarrow', 'updownarrow',
            'infty', 'forall', 'exists', 'vec', 'hat', 'bar', 'dot', 'ddot', 'tilde',
            'mathbb', 'mathcal', 'mathbf', 'mathrm'
        ];
        // Create a regex to find any of these commands if they are NOT preceded by a backslash.
        // We use word boundaries (\\b) to avoid matching substrings (e.g., 'fraction').
        const commandRegex = new RegExp(`\\b(?<!\\\\)(${latexCommands.join('|')})\\b`, 'g');
        fixedContent = fixedContent.replace(commandRegex, '\\$1');
        return fixedContent;
    };

    // Apply the fix only to content within math delimiters ($...$ or $$...$$)
    processedText = processedText.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g, (match) => {
        return applyLatexFixes(match);
    });

    // 4. Continue with existing markdown parsing using processedText
    const placeholders = new Map<string, string>();
    const addPlaceholder = (content: string) => {
        const key = `__PLACEHOLDER_${placeholders.size}__`;
        placeholders.set(key, content);
        return key;
    };

    let tempText = processedText;

    tempText = tempText
        .replace(/```([\s\S]*?)```/g, (match) => addPlaceholder(match))
        .replace(/\$\$([\s\S]*?)\$\$/g, (match) => addPlaceholder(match))
        .replace(/\$([^$\n]+?)\$/g, (match) => addPlaceholder(match))
        .replace(/`([^`]+?)`/g, (match) => addPlaceholder(match));

    const processInlineMarkdown = (line: string) => {
        return line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    let html = tempText
        .split('\n\n')
        .map(block => {
            block = block.trim();
            if (!block) return '';

            // --- Markdown Table Parsing ---
            const tableLines = block.split('\n').filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
            if (tableLines.length >= 2) {
                const separatorLine = tableLines[1];
                const isSeparatorValid = /^\s*\|?(\s*:?-+:?\s*\|)+(\s*:?-+:?\s*)?\|?\s*$/.test(separatorLine);

                if (isSeparatorValid) {
                    const headers = tableLines[0].split('|').slice(1, -1).map(h => h.trim());
                    const rows = tableLines.slice(2).map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));

                    const headerHtml = `<thead><tr class="border-b border-border bg-card-secondary/60">${headers.map(h => `<th class="p-3 text-left font-semibold text-text-primary text-sm">${processInlineMarkdown(h)}</th>`).join('')}</tr></thead>`;
                    
                    const bodyHtml = `<tbody>${rows.map((row, rowIndex) => `
                        <tr class="border-b border-border last:border-b-0 ${rowIndex % 2 !== 0 ? 'bg-card-secondary/40' : 'bg-card'}">
                            ${row.map(cell => `<td class="p-3 text-sm text-text-secondary">${processInlineMarkdown(cell)}</td>`).join('')}
                        </tr>
                    `).join('')}</tbody>`;

                    return `
                        <div class="my-4 overflow-x-auto rounded-lg border border-border">
                            <table class="min-w-full text-left">${headerHtml}${bodyHtml}</table>
                        </div>
                    `;
                }
            }
            // --- END: Markdown Table Parsing ---

            const isUnorderedList = block.match(/^\s*(\*|-)\s/m);
            const isOrderedList = block.match(/^\s*\d+\.\s/m);

            if (isUnorderedList || isOrderedList) {
                const lines = block.split('\n');
                let listHtml = '';
                let currentItemContent = '';

                const commitCurrentItem = () => {
                    if (currentItemContent) {
                        const processedItem = processInlineMarkdown(currentItemContent.trim());
                        listHtml += `<li>${processedItem.replace(/\n/g, '<br>')}</li>`;
                        currentItemContent = '';
                    }
                };

                for (const line of lines) {
                    const listItemMatch = line.match(/^\s*(?:(?:\*|-)|(?:\d+\.))\s+(.*)/);
                    if (listItemMatch) {
                        commitCurrentItem();
                        currentItemContent = listItemMatch[1];
                    } else if (currentItemContent) {
                        currentItemContent += '\n' + line.trim();
                    }
                }
                commitCurrentItem();

                const listTag = isUnorderedList ? 'ul' : 'ol';
                const listClasses = isUnorderedList 
                    ? 'list-disc list-inside space-y-1 my-2' 
                    : 'list-decimal list-inside space-y-1 my-2';
                
                return `<${listTag} class="${listClasses}">${listHtml}</${listTag}>`;
            }

            const processedBlock = processInlineMarkdown(block);
            return `<p class="leading-relaxed">${processedBlock.replace(/\n/g, '<br>')}</p>`;
        })
        .join('');

    placeholders.forEach((value, key) => {
        let replacementContent: string;
        if (value.startsWith('```')) {
            const code = value.slice(3, -3).replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
            replacementContent = `<pre class="bg-card-secondary rounded-md p-3 my-2 overflow-x-auto font-mono text-sm"><code>${code}</code></pre>`;
        } else if (value.startsWith('`')) {
            const code = value.slice(1, -1);
            replacementContent = `<code class="bg-card-secondary rounded px-1 py-0.5 text-red-500">${code}</code>`;
        } else {
            replacementContent = value;
        }
        
        html = html.replace(new RegExp(key, 'g'), () => replacementContent);
    });


    return { __html: html };
};


const ChatMessageContent: React.FC<{ part: Part, isStreaming?: boolean }> = ({ part, isStreaming }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const MathJax = (window as any).MathJax;
        if (contentRef.current && part.text && !isStreaming && MathJax?.typesetPromise) {
            MathJax.typesetPromise([contentRef.current]).catch((err: any) => {
                console.error("MathJax typesetting failed:", err);
            });
        }
    }, [part.text, isStreaming]);

    if (part.inlineData) {
        return (
            <img
                src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                alt="Hình ảnh đã tải lên"
                className="max-w-full h-auto object-contain self-start rounded-lg shadow-md"
            />
        );
    } else if (part.text) {
        return <div ref={contentRef} dangerouslySetInnerHTML={parseMarkdown(part.text)} />;
    }
    return null;
};

const thinkingMessages = [
    "Đang suy nghĩ...",
    "Phân tích câu hỏi...",
    "Tham khảo kiến thức...",
    "Sắp xếp ý tưởng...",
    "Chuẩn bị câu trả lời..."
];

const ThinkingIndicator: React.FC<{ specificMessage?: string }> = ({ specificMessage }) => {
    const [message, setMessage] = useState(specificMessage || thinkingMessages[0]);

    useEffect(() => {
        if (specificMessage) {
            setMessage(specificMessage);
            return; // Don't cycle if a specific message is provided
        }

        const interval = setInterval(() => {
            setMessage(prev => {
                const currentIndex = thinkingMessages.indexOf(prev);
                const nextIndex = (currentIndex + 1) % thinkingMessages.length;
                return thinkingMessages[nextIndex];
            });
        }, 1500);

        return () => clearInterval(interval);
    }, [specificMessage]);
    
    return (
        <div className="flex items-center space-x-2 text-text-secondary/90">
            <div className="flex items-center space-x-1.5">
              {specificMessage ? (
                <>
                  <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                </>
              )}
            </div>
            <span className="text-sm transition-opacity duration-300">{message}</span>
        </div>
    );
};

const PageProcessingIndicator: React.FC<{ text: string }> = ({ text }) => {
    return (
        <div className="flex items-center space-x-2 text-text-secondary/90 mb-4">
            <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
            </div>
            <span className="text-sm">{text.split('...')[0]}...</span>
        </div>
    );
};

const PartDisplay: React.FC<{ part: SolvedPart, isActive: boolean, index: number }> = ({ part, isActive, index }) => {
    const [isExpanded, setIsExpanded] = useState(isActive);
    const partRef = useRef<HTMLDivElement>(null);
    const wasActive = useRef(isActive);
    const uniqueId = `part-${index}-${part.number}`;

    useEffect(() => {
        if (partRef.current && (window as any).MathJax?.typesetPromise) {
            (window as any).MathJax.typesetPromise([partRef.current]);
        }
    }, [part.steps, part.answer, isExpanded]);

    useEffect(() => {
        if (wasActive.current && !isActive) {
            setIsExpanded(false);
        } else if (isActive) {
            setIsExpanded(true);
        }
        wasActive.current = isActive;
    }, [isActive]);

    const containerClasses = [
        'transition-colors duration-300 rounded-md border border-border',
        isActive ? 'bg-card-secondary/80' : 'bg-card-secondary/40',
        part.isComplete && !isExpanded ? 'opacity-80' : ''
    ].join(' ');

    return (
        <div ref={partRef} className={containerClasses}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left flex items-center justify-between p-2.5 hover:bg-card-secondary/60"
                aria-expanded={isExpanded}
                aria-controls={`part-content-${uniqueId}`}
            >
                <div className="flex items-center gap-2">
                   {part.isComplete && <CheckCircleIcon className="w-5 h-5 text-emerald-500" />}
                   <h4 className="font-semibold text-text-primary text-sm">
                     Phần {part.number}
                   </h4>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-text-secondary transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div id={`part-content-${uniqueId}`} className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="px-3 pb-3 pt-1">
                        {part.steps && (
                            <div className="pl-2.5 border-l-2 border-primary/40 mb-3 text-sm" dangerouslySetInnerHTML={parseMarkdown(part.steps)} />
                        )}
                        {part.answer && (
                            <div>
                                <h5 className="font-semibold text-text-secondary text-xs mb-1">Đáp án:</h5>
                                <div className="text-text-primary text-sm" dangerouslySetInnerHTML={parseMarkdown(part.answer)} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


const QuestionDisplay: React.FC<{ question: SolvedQuestion, isActive: boolean, initiallyExpanded: boolean, index: number }> = ({ question, initiallyExpanded, isActive, index }) => {
    const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
    const questionRef = useRef<HTMLDivElement>(null);
    const uniqueId = `question-${index}-${question.test_code || ''}-${question.number}`;
    const wasActive = useRef(isActive);
    
    useEffect(() => {
        if (questionRef.current && (window as any).MathJax?.typesetPromise) {
            (window as any).MathJax.typesetPromise([questionRef.current]);
        }
    }, [question.steps, question.answer, isExpanded]);
    
    useEffect(() => {
        if (wasActive.current && !isActive) {
            setIsExpanded(false);
        } else if (isActive) {
            setIsExpanded(true);
        }
        wasActive.current = isActive;
    }, [isActive]);

    let activePartIndex = -1;
    if (isActive && question.parts) {
        for (let i = question.parts.length - 1; i >= 0; i--) {
            if (!question.parts[i].isComplete) {
                activePartIndex = i;
                break;
            }
        }
    }
    
    const containerClasses = [
        'transition-colors duration-300 border border-border rounded-lg overflow-hidden',
        isActive ? 'bg-card-secondary/60' : 'bg-card',
        question.isComplete && !isExpanded ? 'opacity-70' : ''
    ].join(' ');

    return (
        <div ref={questionRef} className={containerClasses}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left flex items-center justify-between p-3 hover:bg-card-secondary/30"
                aria-expanded={isExpanded}
                aria-controls={`solution-content-${uniqueId}`}
            >
                <div className="flex items-center gap-3">
                   {question.isComplete && <CheckCircleIcon className="w-6 h-6 text-emerald-500" />}
                   <h3 className="font-bold text-text-primary">
                     {question.test_code && <span className="font-normal text-text-secondary text-sm mr-2">Mã đề {question.test_code}</span>}
                     Câu {question.number}
                   </h3>
                </div>
                <div className="flex items-center gap-3">
                    {!isExpanded && (question.steps || (question.parts && question.parts.length > 0)) && (
                        <div className="text-sm font-medium text-text-secondary">Xem lời giải</div>
                    )}
                    <ChevronDownIcon className={`w-5 h-5 text-text-secondary transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>
            <div 
                id={`solution-content-${uniqueId}`}
                className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
                <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1">
                        {question.steps && (
                            <div className="pl-3 border-l-2 border-primary/50 mb-4" dangerouslySetInnerHTML={parseMarkdown(question.steps)} />
                        )}
                        
                        {question.parts && question.parts.length > 0 && (
                            <div className="space-y-2 my-2">
                                {question.parts.map((part, partIndex) => (
                                    <PartDisplay 
                                        key={`part-${partIndex}-${part.number}-${index}`} 
                                        part={part}
                                        isActive={partIndex === activePartIndex}
                                        index={partIndex}
                                    />
                                ))}
                            </div>
                        )}

                        {question.answer && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-text-secondary text-sm mb-1">Đáp án:</h4>
                                <div className="text-text-primary" dangerouslySetInnerHTML={parseMarkdown(question.answer)} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SolutionContent: React.FC<{ solution: { questions: SolvedQuestion[] }, isStreaming: boolean }> = ({ solution, isStreaming }) => {
    let activeQuestionIndex = -1;
    if (isStreaming) {
        for (let i = solution.questions.length - 1; i >= 0; i--) {
            if (!solution.questions[i].isComplete) {
                activeQuestionIndex = i;
                break;
            }
        }
    }

    return (
        <div className="space-y-4">
            {solution.questions.map((q, index) => (
                <QuestionDisplay 
                    key={`question-${index}-${q.test_code || ''}-${q.number}`} 
                    question={q} 
                    isActive={index === activeQuestionIndex}
                    initiallyExpanded={index === activeQuestionIndex}
                    index={index}
                />
            ))}
        </div>
    );
};

const FinalAnswerItem: React.FC<{ item: FinalAnswer }> = ({ item }) => {
    const answerRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const MathJax = (window as any).MathJax;
        if (answerRef.current && item.answer && MathJax?.typesetPromise) {
            MathJax.typesetPromise([answerRef.current]).catch((err: any) => {
                console.error("MathJax typesetting failed:", err);
            });
        }
    }, [item.answer]);

    return (
        <div className="flex items-baseline">
            <span className="font-semibold text-text-secondary mr-2 shrink-0">{item.number}.</span>
            <span ref={answerRef} className="font-bold text-text-primary" dangerouslySetInnerHTML={parseMarkdown(item.answer)} />
        </div>
    );
};

const FinalAnswerContent: React.FC<{ finalAnswers: FinalAnswerSet }> = ({ finalAnswers }) => {
    if (!finalAnswers || finalAnswers.answers.length === 0) {
        return null;
    }
    return (
        <div className="w-full">
            <h3 className="font-bold text-lg mb-4 text-center">{finalAnswers.title || "Bảng Đáp Án"}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-3">
                {finalAnswers.answers.map((item, index) => (
                    <FinalAnswerItem key={`final-answer-${index}-${item.number}`} item={item} />
                ))}
            </div>
        </div>
    );
};


interface ChatMessageComponentProps {
    message: ChatMessage;
    onViewPdf: (base64Data: string) => void;
}

const ChatMessageComponent: React.FC<ChatMessageComponentProps> = ({ message, onViewPdf }) => {
  const isUser = message.role === 'user';
  
  // --- User Message Rendering ---
  if (isUser) {
    const textParts = message.parts.filter(p => p.text);
    const imageParts = message.parts.filter(p => p.inlineData);

    const bubbleClasses = 'bg-primary text-primary-text self-end rounded-t-2xl rounded-bl-2xl';

    return (
      <div className="flex justify-end mb-4">
        <div className={`max-w-2xl p-4 shadow-sm font-sans ${bubbleClasses}`}>
          <div className="flex flex-col gap-3">
            {/* Render all text parts first */}
            {textParts.map((part, index) => (
              part.text && <ChatMessageContent key={`text-${index}`} part={part} isStreaming={message.isStreaming} />
            ))}
            {/* Then render the PDF attachment */}
            {message.pdfAttachment && (
                <button
                    onClick={() => onViewPdf(message.pdfAttachment!.base64Data)}
                    className="mt-2 bg-primary-text/10 p-2.5 rounded-lg hover:bg-primary-text/20 w-full text-left transition-colors"
                    aria-label={`Xem tệp PDF: ${message.pdfAttachment.name}`}
                >
                    <div className="flex items-center gap-3">
                        <DocumentTextIcon className="w-6 h-6 text-primary-text/80 shrink-0" />
                        <span className="font-medium text-sm truncate" title={message.pdfAttachment.name}>
                            {message.pdfAttachment.name}
                        </span>
                    </div>
                </button>
            )}
            {/* Then render a grid of images, if any */}
            {imageParts.length > 0 && (
              <div className={`grid gap-2 ${imageParts.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} mt-2`}>
                {imageParts.map((part, index) => (
                  <img
                    key={`image-${index}`}
                    src={`data:${part.inlineData!.mimeType};base64,${part.inlineData!.data}`}
                    alt={`Hình ảnh đính kèm ${index + 1}`}
                    className="max-w-full h-auto object-contain self-start rounded-lg bg-primary-text/10 p-1"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Model Message Rendering ---
  const isSolutionEmpty = !message.solution || message.solution.questions.length === 0;
  const isFinalAnswersEmpty = !message.finalAnswers || message.finalAnswers.answers.length === 0;
  
  const hasAnyContent = 
    message.parts.some(p => (p.text && p.text.trim() !== '' && !p.text.startsWith('Đang xử lý trang')) || p.inlineData) ||
    !isSolutionEmpty ||
    !isFinalAnswersEmpty;

  const showThinkingIndicator = message.role === 'model' && message.isStreaming && !hasAnyContent;
  
  const bubbleClasses = showThinkingIndicator
    ? 'bg-card text-text-primary self-start rounded-2xl border border-border'
    : 'bg-card text-text-primary self-start rounded-t-2xl rounded-br-2xl border border-border';
  
  const paddingAndWidthClasses = showThinkingIndicator
    ? 'p-3'
    : 'p-4 max-w-2xl';

  const pageProcessingText = message.role === 'model' && message.parts[0]?.text?.startsWith('Đang xử lý trang') ? message.parts[0].text : null;
  const actualContent = pageProcessingText ? pageProcessingText.substring(pageProcessingText.indexOf('...') + 3).trim() : null;

  const contentParts = message.parts.filter(p => !p.text?.startsWith('Đang xử lý trang'));
  
  if (actualContent) {
      if (contentParts.length > 0 && contentParts[0].text) {
          contentParts[0].text = actualContent + contentParts[0].text;
      } else {
          contentParts.unshift({ text: actualContent });
      }
  }

  return (
    <div className="flex justify-start items-start mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center mr-3 mt-1">
            <NovaIcon className="w-7 h-7 text-primary-text" />
        </div>
      <div className={`shadow-sm font-sans ${bubbleClasses} ${paddingAndWidthClasses}`}>
        {showThinkingIndicator ? (
            <ThinkingIndicator specificMessage={message.thinkingMessage} />
        ) : pageProcessingText && !hasAnyContent ? (
             <PageProcessingIndicator text={pageProcessingText} />
        ) : (
          <>
            {pageProcessingText && <PageProcessingIndicator text={pageProcessingText} />}
            
            {/* Render general text/image parts */}
            <div className="space-y-2">
              {contentParts.map((part, index) => (
                  <ChatMessageContent key={`content-${index}`} part={part} isStreaming={message.isStreaming} />
              ))}
            </div>

            {/* Render structured responses with a margin if there was also text content */}
            <div className={contentParts.some(p => p.text?.trim()) ? "mt-4" : ""}>
                {message.finalAnswers && <FinalAnswerContent finalAnswers={message.finalAnswers} />}
                {message.solution && <SolutionContent solution={message.solution} isStreaming={!!message.isStreaming} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(ChatMessageComponent);