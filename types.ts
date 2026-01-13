
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export enum ViewMode {
  CHAT = 'chat',
  ANALYSIS = 'analysis',
  MAKER_PROCESS = 'maker_process'
}

export type AIProvider = 'ollama';

export type ReasoningEffort = 'low' | 'medium' | 'high';

export interface AISettings {
  provider: AIProvider;
  ollamaUrl: string; 
  ollamaModel: string;
  temperature: number;
  enableMaker: boolean; // Toggle per abilitare/disabilitare il MAKER Loop
  reasoningEffort: ReasoningEffort; // LOW=fast/nothink, MEDIUM=balanced, HIGH=deep thinking
}

export interface ProposedChange {
  id: string;
  type: 'edit_lines' | 'append' | 'replace';
  status: 'pending' | 'applied' | 'discarded';
  description: string;
  originalContent?: string; // Snapshot per visualizzazione
  newContent: string;
  lineStart?: number;
  lineEnd?: number;
  isSnippetModification?: boolean; // TRUE se la modifica è per uno snippet allegato, non per il notepad
  snippetRange?: { start: number, end: number }; // Posizione dello snippet nel notepad originale
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  thoughtContent?: string;
  timestamp: number;
  isThinking?: boolean;
  isStreaming?: boolean;
  analysisResult?: AnalysisResult;
  makerProcessId?: string; // Link al processo MAKER se generato da esso
  proposedChange?: ProposedChange; // NEW: Se il messaggio contiene una proposta di modifica
  attachedSnippet?: string; // Code snippet allegato dall'editor (non incluso nel text)
}

// --- MAKER FRAMEWORK TYPES (PIPELINE VERSION) ---

export type MakerAgentRole = 'ARCHITECT' | 'ENGINEER' | 'GUARDIAN' | 'PERFECTIONIST';

export interface MakerStep {
  id: number;
  agentRole: MakerAgentRole;
  title: string;
  description: string;
  status: 'pending' | 'working' | 'completed' | 'failed';
  inputContext?: string; // Il codice ricevuto dallo step precedente
  outputContent?: string; // Il codice prodotto da questo step
  logs: string[];
}

export interface MakerProcess {
  id: string;
  userPrompt: string;
  status: 'planning' | 'executing' | 'completed' | 'failed';
  steps: MakerStep[];
  currentStepIndex: number;
  finalResult: string;
  createdAt: number;
}

// -----------------------------

export interface ProjectContext {
  content: string;
  isSet: boolean;
}

export interface SavedSnippet {
  id: string;
  title: string;
  content: string;
  language: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  projectContext?: ProjectContext;
  memories?: string[];
  makerProcess?: MakerProcess; // Stato attivo del processo maker
  notepadContent?: string; // Content of the interactive notepad
  createdAt: number;
  updatedAt: number;
}

export interface FileChunk {
  id: string;
  fileId: string;
  fileName: string;
  content: string;
  index: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  content: string;
  size: number;
  chunks?: FileChunk[];
}

export interface AnalysisResult {
  overallScore: number;
  summary: string;
  criteriaScores: {
    clarity: number;
    specificity: number;
    context: number;
    constraints: number;
    persona: number;
    logic: number;
    creativity: number;
    robustness: number;
  };
  lineByLineCritique: {
    line: string;
    analysis: string;
  }[];
  keyIssues: {
    issue: string;
    whyItMatters: string;
  }[];
  detailedSuggestions: {
    suggestion: string;
    examples: string[];
  }[];
  probingQuestions: string[];
  promptVariations: {
    type: string;
    content: string;
    explanation: string;
  }[];
}
