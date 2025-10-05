import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, Part, SolvedQuestion, FinalAnswerSet } from '../types';
import { NovaIcon, CheckCircleIcon } from './Icons';

// This function parses a custom markdown dialect that also supports LaTeX via MathJax.
// It works by temporarily replacing math and code blocks with unique placeholders,
// processing the markdown, and then re-injecting the original math/code blocks.
// This prevents the markdown parser from interfering with LaTeX syntax (e.g., `_` for subscripts).
const parseMarkdown = (text: string) => {
    if (!text) return { __html: '' };
    const placeholders = new Map<string, string>();
    const addPlaceholder = (content: string) => {
        const key = `__PLACEHOLDER_${placeholders.size}__`;
        placeholders.set(key, content);
        return key;
    };

    let tempText = text;

    // 1. Protect content that should not be parsed as markdown.
    // Order is important: handle larger/more specific blocks first.
    tempText = tempText
        // Multi-line code blocks
        .replace(/```([\s\S]*?)```/g, (match) => addPlaceholder(match))
        // Display math
        .replace(/\$\$([\s\S]*?)\$\$/g, (match) => addPlaceholder(match))
        // Inline math. A simpler regex is used for better compatibility.
        .replace(/\$([^$\n]+?)\$/g, (match) => addPlaceholder(match))
        // Inline code
        .replace(/`([^`]+?)`/g, (match) => addPlaceholder(match));

    // 2. Process markdown on the remaining text.
    const processInlineMarkdown = (line: string) => {
        return line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    let html = tempText
        .split('\n\n') // Split into paragraphs/blocks
        .map(block => {
            block = block.trim();
            if (!block) return '';

            const isUnorderedList = block.match(/^\s*(\*|-)\s/m);
            const isOrderedList = block.match(/^\s*\d+\.\s/m);

            // Handle lists (both ordered and unordered) with multi-line items
            if (isUnorderedList || isOrderedList) {
                const lines = block.split('\n');
                let listHtml = '';
                let currentItemContent = '';

                const commitCurrentItem = () => {
                    if (currentItemContent) {
                        const processedItem = processInlineMarkdown(currentItemContent.trim());
                        listHtml += `<li>${processedItem.replace(/\n/g, '<br />')}</li>`;
                        currentItemContent = '';
                    }
                };

                for (const line of lines) {
                    // Regex to match the start of a list item (ordered or unordered)
                    const listItemMatch = line.match(/^\s*(?:(?:\*|-)|(?:\d+\.))\s+(.*)/);
                    if (listItemMatch) {
                        commitCurrentItem();
                        currentItemContent = listItemMatch[1]; // content is in the first capture group
                    } else if (currentItemContent) {
                        // This line is a continuation of the previous list item, preserve the newline
                        currentItemContent += '\n' + line.trim();
                    }
                }
                commitCurrentItem(); // Commit the last item

                const listTag = isUnorderedList ? 'ul' : 'ol';
                const listClasses = isUnorderedList 
                    ? 'list-disc list-inside space-y-1 my-2' 
                    : 'list-decimal list-inside space-y-1 my-2';
                
                return `<${listTag} class="${listClasses}">${listHtml}</${listTag}>`;
            }

            // Handle paragraphs, preserving line breaks
            const processedBlock = processInlineMarkdown(block);
            return `<p class="leading-relaxed">${processedBlock.replace(/\n/g, '<br />')}</p>`;
        })
        .join('');

    // 3. Restore placeholders with their final HTML representation.
    placeholders.forEach((value, key) => {
        let replacementContent: string;
        if (value.startsWith('```')) {
            const code = value.slice(3, -3).replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
            replacementContent = `<pre class="bg-card-secondary rounded-md p-3 my-2 overflow-x-auto"><code>${code}</code></pre>`;
        } else if (value.startsWith('`')) {
            const code = value.slice(1, -1);
            replacementContent = `<code class="bg-card-secondary rounded px-1 py-0.5 text-red-500">${code}</code>`;
        } else {
            // This is a MathJax block. Restore it as-is.
            replacementContent = value;
        }
        
        html = html.replace(key, () => replacementContent);
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
                alt="Uploaded content"
                className="max-w-xs rounded-lg mt-2 shadow-md"
            />
        );
    }
    if (part.text) {
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

const ThinkingIndicator: React.FC = () => {
    const [message, setMessage] = useState(thinkingMessages[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessage(prev => {
                const currentIndex = thinkingMessages.indexOf(prev);
                const nextIndex = (currentIndex + 1) % thinkingMessages.length;
                return thinkingMessages[nextIndex];
            });
        }, 1500);

        return () => clearInterval(interval);
    }, []);
    
    return (
        <div className="flex items-center space-x-2 text-text-secondary/90">
            <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
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
            <span className="text-sm">{text}</span>
        </div>
    );
};


const QuestionDisplay: React.FC<{ question: SolvedQuestion, isActive: boolean }> = ({ question, isActive }) => {
    const showSteps = !question.isComplete;
    const questionRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (questionRef.current && (window as any).MathJax) {
            (window as any).MathJax.typesetPromise([questionRef.current]);
        }
    }, [question.steps, question.answer, showSteps]);
    
    const containerClasses = [
        'border-b border-border/50 pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0 transition-all duration-500',
        question.isComplete ? 'opacity-60' : 'opacity-100',
        isActive ? 'bg-card-secondary/30 rounded-lg p-3 -m-3' : ''
    ].join(' ');

    return (
        <div 
            ref={questionRef} 
            className={containerClasses}
        >
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-text-primary">Câu {question.number}</h3>
                {question.isComplete && <CheckCircleIcon className="w-6 h-6 text-emerald-500" />}
            </div>
            <div 
                className={`grid transition-all duration-500 ease-in-out ${showSteps ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    {question.steps && (
                        <div className="pl-3 border-l-2 border-primary/50 mb-3" dangerouslySetInnerHTML={parseMarkdown(question.steps)} />
                    )}
                </div>
            </div>
            {question.answer && (
                <div className={`transition-all duration-300 ${!showSteps ? 'font-semibold text-primary' : ''}`} dangerouslySetInnerHTML={parseMarkdown(question.answer)} />
            )}
        </div>
    );
};


const SolutionContent: React.FC<{ solution: { questions: SolvedQuestion[] }, isStreaming: boolean }> = ({ solution, isStreaming }) => {
    // Only highlight the current question if the response is actively streaming.
    // FIX: Property 'findLastIndex' does not exist on type 'SolvedQuestion[]'. Replaced with a backwards loop for better compatibility.
    let activeQuestionIndex = -1;
    if (isStreaming) {
        // Find the last question that is not yet complete.
        for (let i = solution.questions.length - 1; i >= 0; i--) {
            if (!solution.questions[i].isComplete) {
                activeQuestionIndex = i;
                break;
            }
        }
    }

    return (
        <div>
            {solution.questions.map((q, index) => (
                <QuestionDisplay 
                    key={q.number || index} 
                    question={q} 
                    isActive={index === activeQuestionIndex}
                />
            ))}
        </div>
    );
};

const FinalAnswerContent: React.FC<{ finalAnswers: FinalAnswerSet }> = ({ finalAnswers }) => {
    if (!finalAnswers || finalAnswers.answers.length === 0) {
        return null; // Don't render anything if there are no answers yet
    }
    return (
        <div className="w-full">
            <h3 className="font-bold text-lg mb-4 text-center">{finalAnswers.title || "Bảng Đáp Án"}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-3">
                {finalAnswers.answers.map((item, index) => (
                    <div key={index} className="flex items-baseline">
                        <span className="font-semibold text-text-secondary mr-2">{item.number}.</span>
                        <span className="font-bold text-text-primary">{item.answer}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const ChatMessageComponent: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const bubbleClasses = isUser
    ? 'bg-primary text-primary-text self-end rounded-t-2xl rounded-bl-2xl'
    : 'bg-card text-text-primary self-start rounded-t-2xl rounded-br-2xl border border-border';
  const containerClasses = isUser ? 'justify-end' : 'justify-start items-start';

  const showThinkingIndicator = message.role === 'model' && message.isStreaming && (!message.parts.length || !message.parts[0].text) && !message.solution && !message.finalAnswers;
  const pageProcessingText = message.isStreaming && message.parts[0]?.text?.startsWith('Đang xử lý trang') ? message.parts[0].text : null;

  // Filter out the processing text part so it's not rendered by ChatMessageContent
  const contentParts = pageProcessingText 
    ? message.parts.filter(p => p.text !== pageProcessingText)
    : message.parts;

  return (
    <div className={`flex ${containerClasses} mb-4`}>
        {!isUser && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center mr-3 mt-1">
                <NovaIcon className="w-7 h-7 text-primary-text" />
            </div>
        )}
      <div className={`max-w-2xl p-4 shadow-sm font-sans ${bubbleClasses}`}>
        {showThinkingIndicator ? (
            <ThinkingIndicator />
        ) : pageProcessingText ? (
            <>
              <PageProcessingIndicator text={pageProcessingText} />
              {message.finalAnswers && <FinalAnswerContent finalAnswers={message.finalAnswers} />}
            </>
        ) : message.finalAnswers ? (
            <FinalAnswerContent finalAnswers={message.finalAnswers} />
        ) : message.solution ? (
            <SolutionContent solution={message.solution} isStreaming={!!message.isStreaming} />
        ) : (
            contentParts.map((part, index) => (
                <ChatMessageContent key={index} part={part} isStreaming={message.isStreaming} />
            ))
        )}
      </div>
    </div>
  );
};

export default React.memo(ChatMessageComponent);
