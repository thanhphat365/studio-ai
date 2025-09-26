export enum EducationalStage {
  Elementary = 'Tiểu học',
  MiddleSchool = 'Trung học cơ sở',
  HighSchool = 'Trung học phổ thông',
}

export enum DifficultyLevel {
  Basic = 'Cơ bản',
  Advanced = 'Nâng cao',
}

export type LearningMode = 'solve' | 'review';

export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface ChatMessage {
  id?: string; // Optional unique identifier for a message
  role: 'user' | 'model';
  parts: Part[];
}

export interface UploadedFile {
    name: string;
    type: string;
    base64Data: string;
}