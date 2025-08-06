// UI Constants
export const UI_CONSTRAINTS = {
  MAX_CHAT_HISTORY: 100,
  MAX_COMMAND_HISTORY: 50,
  MAX_INPUT_LINES: 3,
  HEADER_LINES: 6,
  STATUS_LINES: 1,
  MARGIN_LINES: 2,
  INPUT_LINES: 5,
} as const;

// OAuth Constants for AgentCore Integration
export const OAUTH_CONFIG = {
  TOKEN_PATH: 'token.json',
  REDIRECT_URI: 'http://localhost:8080/callback',
  PORT: 8080,
  AGENT_CORE_BASE_URL:
    process.env.AGENT_CORE_URL || 'http://localhost:3030/api/v1',
  SCOPES: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/calendar.events',
  ] as string[],
} as const;

// Performance Constants
export const PERFORMANCE = {
  DEBOUNCE_RESIZE: 50,
  PROCESSING_DELAY: 800,
} as const;

// Commands
export const COMMANDS = {
  HELP: '/help',
  LOGIN: '/login',
  LOGOUT: '/logout',
  AUTH: '/auth',
  EXIT: '/exit',
} as const;
