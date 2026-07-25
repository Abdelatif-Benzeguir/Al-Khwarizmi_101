export interface UserData {
  uid: string;
  name: string;
  email: string;
  cohort: string;
  team: string;
  approved: boolean;
  role: 'student' | 'teacher';
  python: number;
  hackathon: number;
  createdAt?: any;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  type: ResourceType;
  duration?: number;
  difficulty?: number;
  link?: string;
  cloudLink?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type ResourceType = 'محاضرة' | 'فيديو' | 'كود بايثون' | 'برومبت' | 'مصطلح';

export interface ChatMessage {
  id: string;
  cohort: string;
  text: string;
  senderUid: string;
  senderName: string;
  senderRole: 'student' | 'teacher';
  timestamp?: any;
  isPinned: boolean;
}

export interface Suggestion {
  id: string;
  title: string;
  type: string;
  link?: string;
  studentName: string;
  studentUid: string;
  timestamp?: any;
}

export interface QuizQuestion {
  context: string;
  question: string;
  options: string[];
  correct: number;
  hint?: string;
  explanation: string;
}
