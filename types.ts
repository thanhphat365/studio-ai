// types.ts

export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface SolvedPart {
  number: string;
  steps?: string;
  answer?: string;
  isComplete?: boolean;
}

export interface SolvedQuestion {
  test_code?: string;
  number: string;
  steps?: string;
  answer?: string;
  parts?: SolvedPart[];
  isComplete?: boolean;
}

export interface FinalAnswer {
  number: string;
  answer: string;
}

export interface FinalAnswerSet {
  title?: string;
  answers: FinalAnswer[];
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  parts: Part[];
  pdfAttachment?: {
    name: string;
    base64Data: string;
  };
  isStreaming?: boolean;
  solution?: {
    questions: SolvedQuestion[];
  };
  finalAnswers?: FinalAnswerSet;
  thinkingMessage?: string;
}

export enum EducationalStage {
  PrimarySchool = "Tiểu học",
  MiddleSchool = "Trung học cơ sở",
  HighSchool = "Trung học phổ thông",
  University = "Đại học",
  Expert = "Chuyên gia"
}

export enum DifficultyLevel {
  Basic = "Cơ bản",
  Intermediate = "Trung bình",
  Advanced = "Nâng cao"
}

export type LearningMode = 'solve_socratic' | 'solve_direct' | 'solve_final_answer' | 'review';

export type AIProvider = 'gemini' | 'openai' | 'deepseek' | 'deep_thought';

export interface UploadedFile {
  name: string;
  type: string;
  base64Data: string;
  progress?: number; // -1 for error, 0-100 for progress
}

export type ThemePalette = 'default' | 'mint' | 'twilight' | 'sepia' | 'custom';

export interface CustomThemeColors {
    background: string;
    text: string;
    primary: string;
}

export interface User {
    username: string;
}