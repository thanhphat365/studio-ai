import { ChatMessage } from '../types';
import { convertToOpenAIMessages } from './openaiService'; // Reuse the converter

// Generates a response stream from DeepSeek's API
export async function* generateDeepSeekResponseStream(
    messages: ChatMessage[],
    systemInstruction: string
): AsyncGenerator<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        yield "Lỗi: Khóa API của DeepSeek chưa được cấu hình. Vui lòng liên hệ quản trị viên.";
        return;
    }

    const apiMessages = convertToOpenAIMessages(messages); // DeepSeek is OpenAI compatible

    const body = {
        model: "deepseek-chat",
        messages: [
            { role: "system", content: systemInstruction },
            ...apiMessages
        ],
        stream: true,
    };

    const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        yield `Lỗi từ API DeepSeek: ${response.status} ${response.statusText} - ${errorText}`;
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
                    console.error("Error parsing DeepSeek stream chunk:", e, "Chunk:", data);
                }
            }
        }
    }
}

// Non-streaming version for short, synchronous responses
export const generateDeepSeekResponse = async (
    messages: ChatMessage[],
    systemInstruction: string
): Promise<string> => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        throw new Error("Lỗi: Khóa API của DeepSeek chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
    }

    const apiMessages = convertToOpenAIMessages(messages);

    const body = {
        model: "deepseek-chat",
        messages: [
            { role: "system", content: systemInstruction },
            ...apiMessages
        ],
        stream: false,
    };

    const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lỗi từ API DeepSeek: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
};
