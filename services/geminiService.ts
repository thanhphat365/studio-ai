import { GoogleGenAI, Content, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Generates a response stream from Google Gemini API
export const generateGeminiResponseStream = (
    messages: ChatMessage[],
    systemInstruction: string
): AsyncGenerator<string> => {
    
    return (async function*() {
        if (!process.env.API_KEY) {
            yield "Lỗi: Khóa API của Google Gemini chưa được cấu hình. Vui lòng liên hệ quản trị viên.";
            return;
        }

        const contents: Content[] = messages.map(msg => ({
            role: msg.role,
            parts: msg.parts
        }));
        
        try {
            const streamPromise = ai.models.generateContentStream({
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
             yield `Lỗi từ Gemini: ${e.message}`;
        }
    })();
};


// Non-streaming version for short, synchronous responses
export const generateGeminiResponse = async (
    messages: ChatMessage[],
    systemInstruction: string
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("Lỗi: Khóa API của Google Gemini chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
    }

    const contents: Content[] = messages.map(msg => ({
        role: msg.role,
        parts: msg.parts
    }));

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
            }
        });
        
        return response.text;
    } catch (e: any) {
        console.error("Gemini non-stream error:", e);
        throw new Error(`Lỗi từ Gemini: ${e.message}`);
    }
};


// Generates an image using Gemini's Imagen model
export const generateImage = async (prompt: string): Promise<string> => {
    try {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set for Gemini Image Generation.");
        }
        const response = await ai.models.generateImages({
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
            throw new Error("No image was generated.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image.");
    }
};