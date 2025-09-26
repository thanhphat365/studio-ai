import React, { useRef, useEffect } from 'react';
import { ChatMessage, Part } from '../types';
import { BrainCircuitIcon } from './Icons';

// More robust markdown-to-HTML parser that correctly handles lists and code blocks.
const parseMarkdown = (text: string) => {
    // 1. Protect code blocks with placeholders
    const placeholders: string[] = [];
    const addPlaceholder = (content: string) => {
        const key = `__PLACEHOLDER_${placeholders.length}__`;
        placeholders.push(content);
        return key;
    };

    let tempText = text;
    // Protect multi-line code blocks: ```...```
    tempText = tempText.replace(/```([\s\S]*?)```/g, (match) => {
        const codeContent = match.slice(3, -3); // Get content inside ```
        const encodedCode = codeContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return addPlaceholder(`<pre class="bg-gray-200 dark:bg-gray-800 rounded-md p-3 my-2 overflow-x-auto"><code>${encodedCode}</code></pre>`);
    });

    // Helper for processing inline markdown in a specific order
    const processInlineMarkdown = (line: string) => {
        let processedLine = line;
        // Order of operations is important here to avoid conflicts.
        // 1. Code
        processedLine = processedLine.replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-800 rounded px-1 py-0.5 text-red-500">$1</code>');
        // 2. Bold
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // 3. Italic
        processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return processedLine;
    };

    // 2. Process block-level elements: lists and paragraphs
    let html = tempText
        .split('\n\n') // Split into paragraphs based on blank lines
        .map(block => {
            block = block.trim();
            if (!block) return '';

            // Check for unordered lists (lines starting with * or -)
            if (block.match(/^(\*|-)\s/m)) {
                const listItems = block.split('\n').map(item => {
                    const content = item.replace(/^(\*|-)\s+/, '');
                    return `<li>${processInlineMarkdown(content)}</li>`;
                }).join('');
                return `<ul class="list-disc list-inside space-y-1 my-2">${listItems}</ul>`;
            }

            // Check for ordered lists (lines starting with 1., 2., etc.)
            if (block.match(/^\d+\.\s/m)) {
                const listItems = block.split('\n').map(item => {
                    const content = item.replace(/^\d+\.\s+/, '');
                    return `<li>${processInlineMarkdown(content)}</li>`;
                }).join('');
                return `<ol class="list-decimal list-inside space-y-1 my-2">${listItems}</ol>`;
            }

            // Otherwise, it's a paragraph or a multi-line text block.
            const processedBlock = processInlineMarkdown(block);

            // A single line of text is treated as a standard paragraph and given
            // extra line spacing for readability.
            if (!block.includes('\n')) {
                return `<p class="leading-relaxed">${processedBlock}</p>`;
            } 
            // Multiple lines in a block are treated as a single text block
            // with hard breaks, but with a tighter, standard line height.
            // This is better for definition lists or poems.
            else {
                return `<p>${processedBlock.replace(/\n/g, '<br />')}</p>`;
            }
        })
        .join('');

    // 3. Restore placeholders
    html = html.replace(/__PLACEHOLDER_(\d+)__/g, (match, index) => {
        return placeholders[parseInt(index, 10)];
    });

    return { __html: html };
};


const ChatMessageContent: React.FC<{ part: Part }> = ({ part }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Use MathJax to typeset the content of the message.
        const MathJax = (window as any).MathJax;
        if (contentRef.current && part.text && MathJax?.typesetPromise) {
            MathJax.typesetPromise([contentRef.current]).catch((err: any) => {
                console.error("MathJax typesetting failed:", err);
            });
        }
    }, [part.text]);

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
        // Add a key to the div to help React diffing when content changes rapidly
        return <div key={part.text} ref={contentRef} dangerouslySetInnerHTML={parseMarkdown(part.text)} />;
    }
    return null;
};

const ChatMessageComponent: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const bubbleClasses = isUser
    ? 'bg-blue-600 text-white self-end'
    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 self-start';
  const containerClasses = isUser ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex ${containerClasses} mb-4`}>
        {!isUser && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center mr-3">
                <BrainCircuitIcon className="w-6 h-6 text-white" />
            </div>
        )}
      <div className={`max-w-2xl p-4 rounded-2xl shadow ${bubbleClasses}`}>
        {message.parts.map((part, index) => (
          <ChatMessageContent key={index} part={part} />
        ))}
      </div>
    </div>
  );
};

export default ChatMessageComponent;