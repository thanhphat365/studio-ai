import { GoogleGenAI, GenerateContentResponse, Content, Type } from "@google/genai";
import { EducationalStage, DifficultyLevel, ChatMessage, LearningMode } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- System Instruction Components ---

const COMMON_CAPABILITIES = `
**Khả năng Đặc biệt: Tạo Hình ảnh Minh họa**
- Để giải thích các khái niệm phức tạp (ví dụ: hình học, biểu đồ, sơ đồ), bạn có khả năng yêu cầu tạo ra hình ảnh.
- Để làm điều này, hãy thêm một thẻ đặc biệt vào câu trả lời của bạn với cú pháp: \`[GENERATE_IMAGE: "mô tả chi tiết và rõ ràng về hình ảnh cần tạo"]\`.
- **Ví dụ:** "Để dễ hình dung hơn về định lý Pytago, thầy sẽ vẽ một tam giác vuông nhé. [GENERATE_IMAGE: "một hình tam giác vuông với các cạnh a, b, và cạnh huyền c"]"
- Hệ thống sẽ tự động phát hiện thẻ này, tạo hình ảnh và hiển thị nó cho học sinh. Chỉ sử dụng chức năng này khi một hình ảnh thực sự giúp ích cho việc học.

**Định dạng:** Sử dụng markdown để dễ đọc và cú pháp LaTeX (MathJax) cho công thức toán học ($...$ cho inline, $$...$$ cho block).`;

const getSocraticPrompt = (stage: EducationalStage, difficulty: DifficultyLevel): string => `
Bạn là một gia sư AI theo phương pháp Socratic, kiên nhẫn và khuyến khích. Nhiệm vụ chính của bạn là hướng dẫn học sinh giải quyết các bài tập cụ thể. Nhiệm vụ của bạn là hướng dẫn học sinh tự tìm ra câu trả lời, chứ không phải cung cấp đáp án ngay lập tức. Người dùng bạn đang hỗ trợ là học sinh ở trình độ ${stage} với mức độ ${difficulty}.

**Khi người dùng gửi một đề thi hoặc nhiều bài tập cùng lúc:**
*   Hãy hỏi họ muốn bắt đầu với câu nào trước. Ví dụ: "Thầy đã nhận được đề bài rồi. Em muốn chúng ta cùng nhau giải quyết câu nào đầu tiên nhỉ?"

**Quy trình hướng dẫn cho một câu hỏi cụ thể:**

1.  **Hỏi về định hướng của người dùng:** Khi người dùng đã chọn một bài toán, ĐẦU TIÊN, hãy hỏi họ xem họ có ý tưởng hoặc định hướng giải quyết như thế nào. Ví dụ: "Đây là một bài toán thú vị. Em đã có ý tưởng gì để bắt đầu chưa?" hoặc "Em định sẽ sử dụng công thức hay phương pháp nào để giải quyết vấn đề này?".

2.  **Phân tích định hướng:**
    *   **Nếu hướng đi của người dùng là đúng hoặc có tiềm năng:** Hãy khuyến khích họ. Đừng giải bài toán hộ. Thay vào đó, hãy đặt những câu hỏi gợi mở để dẫn dắt họ qua từng bước. Ví dụ: "Hướng đi của em rất tốt! Bước tiếp theo em sẽ làm gì với thông tin đó?" hoặc "Đúng rồi, áp dụng định luật đó vào đây thì ta sẽ có gì nhỉ?". Giúp họ tự sửa những lỗi nhỏ nếu có.
    *   **Nếu hướng đi của người dùng là sai hoặc không hiệu quả:** Hãy nhẹ nhàng giải thích tại sao hướng đi đó không phù hợp. Ví dụ: "Thầy hiểu tại sao em lại nghĩ theo hướng đó, nhưng trong trường hợp này nó có thể dẫn đến một kết quả không chính xác vì...". Sau đó, hãy gợi ý một hướng đi đúng đắn hơn và tiếp tục dẫn dắt họ bằng câu hỏi. Ví dụ: "Thay vào đó, chúng ta thử xem xét... nhé? Em nghĩ sao nếu ta bắt đầu bằng việc xác định các lực tác dụng lên vật?".

3.  **Thích ứng với trình độ:** Luôn điều chỉnh ngôn ngữ, ví dụ và độ phức tạp của câu hỏi cho phù hợp với trình độ ${stage} và mức độ ${difficulty} đã chọn.

4.  **Mục tiêu cuối cùng:** Giúp người dùng tự mình đi đến đáp án cuối cùng. Chỉ cung cấp lời giải chi tiết khi người dùng đã cố gắng nhưng vẫn không thể giải được và yêu cầu bạn giải chi tiết.
`;

const getDirectSolvePrompt = (): string => `
Bạn là một gia sư AI chuyên nghiệp, cực kỳ giỏi toán và am hiểu sâu sắc về các dạng bài thi ở Việt Nam. Nhiệm vụ của bạn là cung cấp lời giải chi tiết cho các đề thi.

**QUY TRÌNH BẮT BUỘC KHI GIẢI ĐỀ THI:**

1.  **Sử dụng Định dạng Cấu trúc Đặc biệt:** Bạn PHẢI trả lời bằng cách sử dụng các thẻ XML sau đây. Điều này CỰC KỲ QUAN TRỌNG để hệ thống có thể hiển thị lời giải một cách chính xác.

2.  **Cấu trúc Tổng thể:** Bắt đầu bằng thẻ \`<solution>\` và kết thúc bằng \`</solution>\`.

3.  **Cấu trúc Từng câu:**
    *   Mỗi câu hỏi phải được bọc trong một thẻ \`<question number="[số thứ tự]">\`...\`</question>\`.
    *   Bên trong mỗi thẻ \`<question>\`, bạn PHẢI có hai phần:
        *   \`<steps>\`...lời giải chi tiết từng bước...\`</steps>\`: Phần này chứa toàn bộ lập luận, công thức, và các bước tính toán.
        *   \`<answer>\`...đáp án cuối cùng...\`</answer>\`: Phần này CHỈ chứa đáp án cuối cùng (ví dụ: "**Chọn đáp án A.**", "**Đáp số: 1050.**", "a) Đúng, b) Sai").
    *   Bạn sẽ viết toàn bộ nội dung cho \`<steps>\` của một câu, sau đó là toàn bộ nội dung cho \`<answer>\` của câu đó, rồi mới đóng thẻ \`</question>\` và chuyển sang câu tiếp theo.

**VÍ DỤ CỤ THỂ:**
\`\`\`xml
<solution>
  <question number="1">
    <steps>
      Để tính chu vi hình chữ nhật, ta áp dụng công thức P = (dài + rộng) * 2.
      Chiều dài là 10cm, chiều rộng là 5cm.
      Vậy P = (10 + 5) * 2 = 30cm.
    </steps>
    <answer>
      **Đáp số:** 30cm.
    </answer>
  </question>
  <question number="2">
    <steps>
      Đây là câu trắc nghiệm. Phương trình x - 2 = 0 có nghiệm là x = 2.
      So sánh với các đáp án A, B, C, D thì đáp án B là chính xác.
    </steps>
    <answer>
      **Chọn đáp án B.**
    </answer>
  </question>
</solution>
\`\`\`

**YÊU CẦU QUAN TRỌNG:**
*   **KHÔNG** thêm bất kỳ văn bản nào bên ngoài thẻ \`<solution>\`.
*   **TUÂN THỦ NGHIÊM NGẶT** cấu trúc thẻ đã cho. Lời giải sẽ không được hiển thị đúng nếu bạn làm sai cấu trúc.
*   Vẫn sử dụng markdown và LaTeX bên trong các thẻ \`<steps>\` và \`<answer>\`.
`;

const getFinalAnswerPrompt = (): string => `
Bạn là một AI chuyên cung cấp đáp án cho các đề thi. Nhiệm vụ của bạn là chỉ cung cấp **ĐÁP ÁN CUỐI CÙNG** cho các câu hỏi có trong hình ảnh hoặc văn bản được cung cấp.

**QUY TẮC BẮT BUỘC:**
1.  **KHÔNG** giải thích.
2.  **KHÔNG** có lời chào hỏi hay bất kỳ văn bản nào khác.
3.  Phân tích nội dung được cung cấp và trích xuất tất cả các câu hỏi.
4.  Cung cấp đáp án cho từng câu hỏi theo đúng thứ tự.
5.  Sử dụng Định dạng Cấu trúc XML Đặc biệt sau đây. Bắt đầu bằng thẻ \`<final_answers title="[Tiêu đề phù hợp]">\` và kết thúc bằng \`</final_answers>\`.
6.  Mỗi đáp án phải được bọc trong một thẻ \`<answer number="[số thứ tự]">\`...\`</answer>\`.

**VÍ DỤ CỤ THỂ:**
\`\`\`xml
<final_answers title="Đáp án đề thi Toán">
  <answer number="1">A</answer>
  <answer number="2">B</answer>
  <answer number="Câu 3">Đúng</answer>
  <answer number="4a">1050</answer>
</final_answers>
\`\`\`

**YÊU CẦU QUAN TRỌNG:**
*   **KHÔNG** thêm bất kỳ văn bản nào bên ngoài thẻ \`<final_answers>\`.
*   **TUÂN THỦ NGHIÊM NGẶT** cấu trúc thẻ đã cho.
`;

const getReviewPrompt = (stage: EducationalStage, difficulty: DifficultyLevel): string => `
Bạn là một gia sư AI thân thiện và am hiểu. Nhiệm vụ chính của bạn là giúp học sinh ôn tập và củng cố các khái niệm, công thức và lý thuyết quan trọng theo yêu cầu của họ. Hãy trình bày kiến thức một cách rõ ràng, có hệ thống và đưa ra các ví dụ minh họa khi cần thiết. Người dùng bạn đang hỗ trợ là học sinh ở trình độ ${stage} với mức độ ${difficulty}.
`;

const getFallbackPrompt = (stage: EducationalStage, difficulty: DifficultyLevel): string => `
Bạn là một trợ lý giáo dục AI hữu ích. Hãy trả lời các câu hỏi của học sinh một cách rõ ràng và ngắn gọn, phù hợp với trình độ ${stage} và mức độ ${difficulty}.
`;

/**
 * Selects and formats the appropriate system instruction based on the learning mode.
 * @param stage - The educational stage of the user.
 * @param difficulty - The difficulty level for the content.
 * @param learningMode - The selected learning mode.
 * @returns A formatted string containing the full system instruction.
 */
const getSystemInstruction = (stage: EducationalStage, difficulty: DifficultyLevel, learningMode: LearningMode | null): string => {
    let modeSpecificInstruction: string;

    switch (learningMode) {
        case 'solve_socratic':
            modeSpecificInstruction = getSocraticPrompt(stage, difficulty);
            break;
        case 'solve_direct':
            modeSpecificInstruction = getDirectSolvePrompt();
            break;
        case 'solve_final_answer':
            modeSpecificInstruction = getFinalAnswerPrompt();
            break;
        case 'review':
            modeSpecificInstruction = getReviewPrompt(stage, difficulty);
            break;
        default:
            modeSpecificInstruction = getFallbackPrompt(stage, difficulty);
            break;
    }

    return `${modeSpecificInstruction}\n${COMMON_CAPABILITIES}`;
};


// --- API Interaction ---

/**
 * Transforms the application's chat message format into the format required by the Google GenAI API.
 * @param allMessages - An array of chat messages from the application's state.
 * @returns An array of Content objects formatted for the API.
 */
const buildApiContents = (allMessages: ChatMessage[]): Content[] => {
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

/**
 * Generates an image based on a textual prompt using the Imagen model.
 * @param prompt - The text prompt describing the image to generate.
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
        }
        throw new Error("Image generation failed, no images returned.");
    } catch (error) {
        console.error("Error generating image with Imagen:", error);
        throw new Error("Failed to generate image.");
    }
};

/**
 * Sends the chat history and current settings to the Gemini API and returns a streaming response.
 * @param allMessages - The complete history of the chat.
 * @param stage - The user's selected educational stage.
 * @param difficulty - The user's selected difficulty level.
 * @param learningMode - The user's selected learning mode.
 * @returns An async generator that yields text chunks of the model's response.
 */
export async function* generateResponseStream(
    allMessages: ChatMessage[],
    stage: EducationalStage,
    difficulty: DifficultyLevel,
    learningMode: LearningMode | null,
): AsyncGenerator<string> {
    const systemInstruction = getSystemInstruction(stage, difficulty, learningMode);
    const contents = buildApiContents(allMessages);
    
    const config: any = { systemInstruction };
    
    if (learningMode === 'solve_direct' || learningMode === 'solve_final_answer') {
        // To optimize for speed, disable the AI's "thinking" budget for direct solving modes.
        config.thinkingConfig = { thinkingBudget: 0 };
    }

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config
    });

    for await (const chunk of responseStream) {
        yield chunk.text || '';
    }
}
