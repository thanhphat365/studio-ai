import { GoogleGenAI, Content, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from '../types';

let ai: GoogleGenAI | null = null;

const getAiInstance = (): GoogleGenAI => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("Lỗi: Khóa API của Google Gemini chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};


// Generates a response stream from Google Gemini API
export const generateGeminiResponseStream = (
    messages: ChatMessage[],
    systemInstruction: string
): AsyncGenerator<string> => {
    
    return (async function*() {
        try {
            const client = getAiInstance();

            const contents: Content[] = messages.map(msg => ({
                role: msg.role,
                parts: msg.parts
            }));
            
            const streamPromise = client.models.generateContentStream({
                model: "gemini-2.5-flash",
                contents: contents,
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            const stream = await streamPromise;
            for await (const chunk of stream) {
                if (chunk && typeof chunk.text === 'string') {
                    yield chunk.text;
                }
            }
        } catch (e: any) {
             console.error("Gemini stream error:", e);
             // Try to find a meaningful message within the error object
             const errorMessage = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
             yield `Lỗi từ Gemini: ${errorMessage}`; // Yield a more informative error message
        }
    })();
};


// Non-streaming version for short, synchronous responses
export const generateGeminiResponse = async (
    messages: ChatMessage[],
    systemInstruction: string
): Promise<string> => {
    try {
        const client = getAiInstance();

        const contents: Content[] = messages.map(msg => ({
            role: msg.role,
            parts: msg.parts
        }));

        const response: GenerateContentResponse = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
            }
        });
        
        return response.text;
    } catch (e: any) {
        console.error("Gemini non-stream error:", e);
        // Rethrow a new error with a user-friendly message from the original error
        throw new Error(e.message);
    }
};


// Generates an image using Gemini's Imagen model
export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const client = getAiInstance();
        
        const response = await client.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg'
            }
        });

        if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
            return response.generatedImages[0].image.imageBytes;
        } else {
            throw new Error("Không có hình ảnh nào được tạo.");
        }
    } catch (error: any) {
        console.error("Error generating image:", error);
        throw new Error(error.message || "Không thể tạo hình ảnh.");
    }
};