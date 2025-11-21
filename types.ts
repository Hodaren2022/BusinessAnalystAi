
export enum UserRole {
  USER = 'user',
  MODEL = 'model'
}

export interface Attachment {
  url: string;
  type: 'image' | 'file';
  name: string;
  mimeType: string;
  storagePath?: string;
}

export interface Message {
  id: string;
  role: UserRole;
  content: string;
  timestamp: number;
  attachment?: Attachment;
}

export interface Stakeholder {
  id: string;
  name: string;
  type: string; // Internal, External, etc.
  needs: string;
  interestScore?: number; // 1-10
  powerScore?: number; // 1-10
}

export interface SWOTItem {
  id: string;
  content: string;
  type: 'strength' | 'weakness' | 'opportunity' | 'threat';
  impactScore?: number; // 1-10 (Positive for S/O, Negative impact magnitude for W/T)
}

export interface KeyMetric {
  id: string;
  label: string; // e.g., "Total Addressable Market", "Initial Investment"
  value: string; // e.g., "$5 Billion", "15%"
}

export interface GeneratedMedia {
  id: string;
  type: 'video';
  url: string;
  promptUsed: string;
  createdAt: number;
}

export interface ProjectData {
  stakeholders: Stakeholder[];
  swot: SWOTItem[];
  keyAssumptions: string[];
  keyMetrics?: KeyMetric[]; // New field for quantitative data
  valueProposition: string;
  customerSegments: string[];
  executiveSummary?: string; // Markdown report
  generatedMedia?: GeneratedMedia[];
  podcastScript?: string;
}

export enum ProjectStatus {
  DRAFT = 'Draft',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed'
}

export type AnalysisPerspective = '1st_person' | '3rd_person';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  updatedAt: number;
  perspective?: AnalysisPerspective;
  data: ProjectData;
}

export type FontSize = 'small' | 'medium' | 'large';
export type Language = 'English' | 'Chinese';

// English Fonts + 5 High Readability Chinese Fonts
export type FontFamily = 
  | 'Inter' 
  | 'Roboto' 
  | 'Merriweather' 
  | 'Open Sans' 
  | 'Lexend'
  | 'Noto Sans TC'     // Standard Sans (Black)
  | 'Noto Serif TC'    // Standard Serif (Song)
  | 'Zen Maru Gothic'  // Rounded (Friendly)
  | 'Shippori Mincho'  // Elegant Mincho
  | 'Zen Old Mincho';  // Classic

export interface AppSettings {
  model: string;
  temperature: number;
  language: Language;
  fontSize: FontSize;
  fontFamily: FontFamily;
  userPreferences?: string;
  customApiKey?: string; // Store user provided API Key
}
