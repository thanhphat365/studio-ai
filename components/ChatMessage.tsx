import React, { useRef, useEffect } from 'react';
import { ChatMessage, Part } from '../types';
import { NovaIcon } from './Icons';

// This function parses a custom markdown dialect that also supports LaTeX via MathJax.
// It works by temporarily replacing math and code blocks with unique placeholders,
// processing the markdown, and then re-injecting the original math/code blocks.
// This prevents the markdown parser from interfering with LaTeX syntax (e.g., `_` for subscripts).
const parseMarkdown = (text: string) => {
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
                        listHtml += `<li>${processInlineMarkdown(currentItemContent.trim())}</li>`;
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
                        // This line is a continuation of the previous list item
                        currentItemContent += ' ' + line.trim();
                    }
                }
                commitCurrentItem(); // Commit the last item

                const listTag = isUnorderedList ? 'ul' : 'ol';
                const listClasses = isUnorderedList 
                    ? 'list-disc list-inside space-y-1 my-2' 
                    : 'list-decimal list-inside space-y-1 my-2';
                
                return `<${listTag} class="${listClasses}">${listHtml}</${listTag}>`;
            }

            // Handle paragraphs
            const processedBlock = processInlineMarkdown(block);
            // In Markdown, single newlines within a paragraph are treated as spaces for text reflow.
            // Paragraph breaks are handled by the `split('\n\n')`.
            return `<p class="leading-relaxed">${processedBlock.replace(/\n/g, ' ')}</p>`;
        })
        .join('');

    // 3. Restore placeholders with their final HTML representation.
    placeholders.forEach((value, key) => {
        let replacementContent: string;
        if (value.startsWith('```')) {
            const code = value.slice(3, -3).replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
            replacementContent = `<pre class="bg-gray-200 dark:bg-gray-800 rounded-md p-3 my-2 overflow-x-auto"><code>${code}</code></pre>`;
        } else if (value.startsWith('`')) {
            const code = value.slice(1, -1);
            replacementContent = `<code class="bg-gray-200 dark:bg-gray-800 rounded px-1 py-0.5 text-red-500">${code}</code>`;
        } else {
            // This is a MathJax block. Restore it as-is.
            replacementContent = value;
        }
        
        // Use a replacer function with .replace(). This is safer than using a replacement string,
        // as it prevents any special sequences (like '$&' or '$1') inside `replacementContent`
        // from being interpreted. Since our keys are unique, this will replace exactly one placeholder.
        html = html.replace(key, () => replacementContent);
    });


    return { __html: html };
};


const ChatMessageContent: React.FC<{ part: Part, isStreaming?: boolean }> = ({ part, isStreaming }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const MathJax = (window as any).MathJax;
        // Only run MathJax typesetting when the stream for this message has finished.
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
                <NovaIcon className="w-7 h-7 text-white" />
            </div>
        )}
      <div className={`max-w-2xl p-4 rounded-2xl shadow font-sans ${bubbleClasses}`}>
        {message.parts.map((part, index) => (
          <ChatMessageContent key={index} part={part} isStreaming={message.isStreaming} />
        ))}
      </div>
    </div>
  );
};

export default React.memo(ChatMessageComponent);