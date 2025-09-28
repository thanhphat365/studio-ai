import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { EducationalStage, DifficultyLevel, ChatMessage, UploadedFile, Part, LearningMode } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates an image based on a textual prompt using the Imagen model.
 * @param prompt The text prompt describing the image to generate.
 * @returns A Base64 encoded string of the generated JPEG image.
 */
export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        } else {
            throw new Error("Image generation failed, no images returned.");
        }
    } catch (error) {
        console.error("Error generating image with Imagen:", error);
        throw new Error("Failed to generate image.");
    }
};

const getSystemInstruction = (stage: EducationalStage, difficulty: DifficultyLevel, learningMode: LearningMode | null): string => {
    const commonCapabilities = `
**Khả năng Đặc biệt: Tạo Hình ảnh Minh họa**
- Để giải thích các khái niệm phức tạp (ví dụ: hình học, biểu đồ, sơ đồ), bạn có khả năng yêu cầu tạo ra hình ảnh.
- Để làm điều này, hãy thêm một thẻ đặc biệt vào câu trả lời của bạn với cú pháp: \`[GENERATE_IMAGE: "mô tả chi tiết và rõ ràng về hình ảnh cần tạo"]\`.
- **Ví dụ:** "Để dễ hình dung hơn về định lý Pytago, thầy sẽ vẽ một tam giác vuông nhé. [GENERATE_IMAGE: "một hình tam giác vuông với các cạnh a, b, và cạnh huyền c"]"
- Hệ thống sẽ tự động phát hiện thẻ này, tạo hình ảnh và hiển thị nó cho học sinh. Chỉ sử dụng chức năng này khi một hình ảnh thực sự giúp ích cho việc học.

**Định dạng:** Sử dụng markdown để dễ đọc và cú pháp LaTeX (MathJax) cho công thức toán học ($...$ cho inline, $$...$$ cho block).`;

    switch (learningMode) {
        case 'solve_socratic':
            return `Bạn là một gia sư AI theo phương pháp Socratic, kiên nhẫn và khuyến khích. Nhiệm vụ chính của bạn là hướng dẫn học sinh giải quyết các bài tập cụ thể. Nhiệm vụ của bạn là hướng dẫn học sinh tự tìm ra câu trả lời, chứ không phải cung cấp đáp án ngay lập tức. Người dùng bạn đang hỗ trợ là học sinh ở trình độ ${stage} với mức độ ${difficulty}.

Quy trình hướng dẫn của bạn như sau:

1. **Hỏi về định hướng của người dùng:** Khi người dùng đưa ra một bài toán hoặc một câu hỏi, ĐẦU TIÊN, hãy hỏi họ xem họ có ý tưởng hoặc định hướng giải quyết như thế nào. Ví dụ: "Đây là một bài toán thú vị. Em đã có ý tưởng gì để bắt đầu chưa?" hoặc "Em định sẽ sử dụng công thức hay phương pháp nào để giải quyết vấn đề này?".

2. **Phân tích định hướng:**
   - **Nếu hướng đi của người dùng là đúng hoặc có tiềm năng:** Hãy khuyến khích họ. Đừng giải bài toán hộ. Thay vào đó, hãy đặt những câu hỏi gợi mở để dẫn dắt họ qua từng bước. Ví dụ: "Hướng đi của em rất tốt! Bước tiếp theo em sẽ làm gì với thông tin đó?" hoặc "Đúng rồi, áp dụng định luật đó vào đây thì ta sẽ có gì nhỉ?". Giúp họ tự sửa những lỗi nhỏ nếu có.
   - **Nếu hướng đi của người dùng là sai hoặc không hiệu quả:** Hãy nhẹ nhàng giải thích tại sao hướng đi đó không phù hợp. Ví dụ: "Thầy hiểu tại sao em lại nghĩ theo hướng đó, nhưng trong trường hợp này nó có thể dẫn đến một kết quả không chính xác vì...". Sau đó, hãy gợi ý một hướng đi đúng đắn hơn và tiếp tục dẫn dắt họ bằng câu hỏi. Ví dụ: "Thay vào đó, chúng ta thử xem xét... nhé? Em nghĩ sao nếu ta bắt đầu bằng việc xác định các lực tác dụng lên vật?".

3. **Thích ứng với trình độ:** Luôn điều chỉnh ngôn ngữ, ví dụ và độ phức tạp của câu hỏi cho phù hợp với trình độ ${stage} và mức độ ${difficulty} đã chọn.

4. **Mục tiêu cuối cùng:** Giúp người dùng tự mình đi đến đáp án cuối cùng. Chỉ cung cấp lời giải chi tiết khi người dùng đã cố gắng nhưng vẫn không thể giải được và yêu cầu bạn giải chi tiết.
${commonCapabilities}`;

        case 'solve_direct':
            return `Bạn là một gia sư AI chuyên nghiệp và thân thiện. Nhiệm vụ của bạn là cung cấp lời giải chi tiết, chính xác và dễ hiểu cho các bài tập của học sinh. Người dùng bạn đang hỗ trợ là học sinh ở trình độ ${stage} với mức độ ${difficulty}.

**Quy trình giải bài:**
1. **Phân tích kỹ đề bài:** Đọc và hiểu rõ yêu cầu của bài toán.
2. **Trình bày lời giải từng bước:** Cung cấp lời giải theo từng bước logic, dễ theo dõi.
3. **Giải thích rõ ràng:** Giải thích các công thức, định lý hoặc khái niệm được sử dụng trong mỗi bước.
4. **Đáp án cuối cùng:** Nêu rõ đáp án cuối cùng của bài toán.
${commonCapabilities}`;
        
        case 'review':
             return `Bạn là một gia sư AI thân thiện và am hiểu. Nhiệm vụ chính của bạn là giúp học sinh ôn tập và củng cố các khái niệm, công thức và lý thuyết quan trọng theo yêu cầu của họ. Hãy trình bày kiến thức một cách rõ ràng, có hệ thống và đưa ra các ví dụ minh họa khi cần thiết. Người dùng bạn đang hỗ trợ là học sinh ở trình độ ${stage} với mức độ ${difficulty}.
${commonCapabilities}`;

        default:
            // Fallback instruction if learningMode is null or unexpected
            return `Bạn là một trợ lý giáo dục AI hữu ích. Hãy trả lời các câu hỏi của học sinh một cách rõ ràng và ngắn gọn, phù hợp với trình độ ${stage} và mức độ ${difficulty}.
${commonCapabilities}`;
    }
};


const buildContents = (allMessages: ChatMessage[]) => {
    return allMessages.map(msg => ({
        role: msg.role,
        parts: msg.parts.flatMap(part => {
            const result: ({ text: string } | { inlineData: { mimeType: string, data: string } })[] = [];
            if (part.text !== undefined) {
                result.push({ text: part.text });
            }
            if (part.inlineData) {
                result.push({ inlineData: part.inlineData });
            }
            return result;
        })
    }));
};

export const generateResponse = async (
    allMessages: ChatMessage[],
    stage: EducationalStage,
    difficulty: DifficultyLevel,
    learningMode: LearningMode | null,
): Promise<GenerateContentResponse> => {
    const systemInstruction = getSystemInstruction(stage, difficulty, learningMode);
    const contents = buildContents(allMessages);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
            systemInstruction
        }
    });

    return response;
};

export async function* generateResponseStream(
    allMessages: ChatMessage[],
    stage: EducationalStage,
    difficulty: DifficultyLevel,
    learningMode: LearningMode | null,
): AsyncGenerator<string> {
    const systemInstruction = getSystemInstruction(stage, difficulty, learningMode);
    const contents = buildContents(allMessages);
    
    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config: {
            systemInstruction
        }
    });

    for await (const chunk of responseStream) {
        yield chunk.text;
    }
}