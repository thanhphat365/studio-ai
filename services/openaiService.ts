import { ChatMessage } from '../types';

// Converts generic ChatMessage array to the format OpenAI/DeepSeek API expects
export const convertToOpenAIMessages = (messages: ChatMessage[]): any[] => {
    return messages.map(msg => {
        const content: any[] = [];
        msg.parts.forEach(part => {
            if (part.text) {
                content.push({ type: 'text', text: part.text });
            } else if (part.inlineData) {
                content.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                    }
                });
            }
        });
        return { role: msg.role === 'model' ? 'assistant' : 'user', content };
    });
};

// Generates a response stream from OpenAI's API
export async function* generateOpenAIResponseStream(
    messages: ChatMessage[],
    systemInstruction: string
): AsyncGenerator<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        yield "Lỗi: Khóa API của OpenAI chưa được cấu hình. Vui lòng liên hệ quản trị viên.";
        return;
    }

    const openAIMessages = convertToOpenAIMessages(messages);

    const body = {
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemInstruction },
            ...openAIMessages
        ],
        stream: true,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        yield `Lỗi từ API OpenAI: ${response.status} ${response.statusText} - ${errorText}`;
        return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const data = line.substring(6);
                if (data.trim() === "[DONE]") return;
                try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices[0]?.delta?.content;
                    if (delta) yield delta;
                } catch (e) {
                    console.error("Error parsing OpenAI stream chunk:", e, "Chunk:", data);
                }
            }
        }
    }
}

// Non-streaming version for short, synchronous responses
export const generateOpenAIResponse = async (
    messages: ChatMessage[],
    systemInstruction: string
): Promise<string> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Lỗi: Khóa API của OpenAI chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
    }

    const openAIMessages = convertToOpenAIMessages(messages);

    const body = {
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemInstruction },
            ...openAIMessages
        ],
        stream: false,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lỗi từ API OpenAI: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || "";
};
