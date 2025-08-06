export type Mode = "text" | "voice" | "thinking";

export interface BaseMessage {
  id: string;
  timestamp: Date;
  content: string;
}

export interface SimpleMessage extends BaseMessage {
  type: "user" | "system";
}

export interface ActionMessage extends BaseMessage {
  type: "action";
  actionType: "description" | "file_update" | "code_diff" | "nested";
  icon?: string;
  metadata?: {
    filePath?: string;
    additions?: number;
    removals?: number;
    lineNumbers?: { start: number; end: number };
    diffLines?: DiffLine[];
  };
}

export interface DiffLine {
  lineNumber: number;
  type: "unchanged" | "added" | "removed";
  content: string;
}

export interface AuthMessage extends BaseMessage {
  type: "auth";
  authType: "status" | "success" | "error" | "loading";
  metadata?: {
    user?: {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };
    provider?: string;
    error?: string;
  };
}

export type ChatMessage = SimpleMessage | ActionMessage | AuthMessage;

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  } | null;
  token: string | null;
}

export interface AppState {
  // UI State
  currentMode: Mode;

  // Chat State
  chatHistory: ChatMessage[];
  currentInput: string;

  // Command History
  commandHistory: string[];
  historyIndex: number;

  // Enhanced Auth State
  auth: AuthState;
  
  // Legacy fields for backward compatibility
  isAuthenticated: boolean;
  userInfo: any | null;
}

export interface AppActions {
  // Mode Management
  switchMode: () => void;
  setMode: (mode: Mode) => void;

  // Chat Management
  addMessage: (message: ChatMessage) => void;
  clearHistory: () => void;

  // Input Management
  setCurrentInput: (input: string) => void;
  addToCommandHistory: (command: string) => void;
  navigateHistory: (direction: "up" | "down") => void;

  // Enhanced Auth Management
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  setAuthSuccess: (user: AuthState['user'], token: string) => void;
  clearAuth: () => void;
  refreshAuth: () => Promise<void>;

  // Legacy Auth Management (for backward compatibility)
  setAuthenticated: (isAuth: boolean) => void;
  setUserInfo: (user: any) => void;
}

export interface ModeConfig {
  icon: string;
  color:
    | "blue"
    | "green"
    | "yellow"
    | "red"
    | "cyan"
    | "magenta"
    | "white"
    | "gray";
}

export const modeConfigs: Record<Mode, ModeConfig> = {
  text: { icon: "⏵⏵", color: "blue" },
  voice: { icon: "🎤", color: "green" },
  thinking: { icon: "⏸", color: "yellow" }
};

export const modes: Mode[] = ["text", "voice", "thinking"];
