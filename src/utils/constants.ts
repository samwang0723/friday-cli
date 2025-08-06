// OAuth Constants for AgentCore Integration
export const OAUTH_CONFIG = {
  TOKEN_PATH: 'token.json',
  REDIRECT_URI: 'http://localhost:8080/callback',
  PORT: Number(process.env.OAUTH_PORT) || 8080,
  AGENT_CORE_BASE_URL:
    process.env.AGENT_CORE_URL || 'http://localhost:3030/api/v1',
  SCOPES: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/calendar.events',
  ] as string[],
} as const;

// Commands
export const COMMANDS = {
  HELP: '/help',
  LOGIN: '/login',
  LOGOUT: '/logout',
  AUTH: '/auth',
  EXIT: '/exit',
} as const;

export const MESSAGE_TYPE = {
  USER: 'user',
  SYSTEM: 'system',
  ACTION: 'action',
  AUTH: 'auth',
} as const;

export const ACTION_TYPE = {
  DESCRIPTION: 'description',
  FILE_UPDATE: 'file_update',
  CODE_DIFF: 'code_diff',
  NESTED: 'nested',
} as const;

export const APP_ACTIONS = {
  SET_MODE: 'SET_MODE',
  SWITCH_MODE: 'SWITCH_MODE',
  ADD_MESSAGE: 'ADD_MESSAGE',
  CLEAR_HISTORY: 'CLEAR_HISTORY',
  SET_CURRENT_INPUT: 'SET_CURRENT_INPUT',
  ADD_TO_COMMAND_HISTORY: 'ADD_TO_COMMAND_HISTORY',
  NAVIGATE_HISTORY: 'NAVIGATE_HISTORY',
  SET_AUTH_LOADING: 'SET_AUTH_LOADING',
  SET_AUTH_ERROR: 'SET_AUTH_ERROR',
  SET_AUTH_SUCCESS: 'SET_AUTH_SUCCESS',
  CLEAR_AUTH: 'CLEAR_AUTH',
  SET_AUTHENTICATED: 'SET_AUTHENTICATED',
  SET_USER_INFO: 'SET_USER_INFO',
} as const;