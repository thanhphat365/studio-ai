
export enum EducationalStage {
  Elementary = 'Tiểu học',
  MiddleSchool = 'Trung học cơ sở',
  HighSchool = 'Trung học phổ thông',
}

export enum DifficultyLevel {
  Basic = 'Cơ bản',
  Advanced = 'Nâng cao',
}

export type LearningMode = 'solve_socratic' | 'solve_direct' | 'review' | 'solve_final_answer';

export type ThemePalette = 'default' | 'mint' | 'twilight' | 'sepia' | 'custom';

export interface CustomThemeColors {
    background: string; // hex color
    text: string;       // hex color
    primary: string;    // hex color
}

export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface SolvedQuestion {
    number: string;
    steps: string;
    answer: string;
    isComplete: boolean;
}

export interface FinalAnswer {
    number: string;
    answer: string;
}

export interface FinalAnswerSet {
    title: string;
    answers: FinalAnswer[];
}

export interface ChatMessage {
  id?: string; // Optional unique identifier for a message
  role: 'user' | 'model';
  parts: Part[];
  solution?: {
      questions: SolvedQuestion[];
  };
  finalAnswers?: FinalAnswerSet;
  isStreaming?: boolean; // True if the message is actively being streamed
}

export interface UploadedFile {
    name: string;
    type: string;
    base64Data: string;
    progress?: number; // 0-100 for progress, -1 for error
}

export interface User {
  username: string;
}