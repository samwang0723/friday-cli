import { useCallback } from 'react';
import meow from 'meow';
import { AppActions, AuthMessage, AuthState, Mode } from '../types.js';
import { googleLogin, logout, getAuthStatus } from '../services/oauth.js';
import { COMMANDS, MESSAGE_TYPE } from '../utils/constants.js';

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export interface CommandProcessorOptions {
  startStream: (message: string, mode: Mode) => Promise<string | null>;
  stopAllStreams: () => void;
  getActiveStreamIds: () => string[];
  isStreaming: (messageId?: string) => boolean;
}

export function useCommandProcessor(
  actions: AppActions,
  options: CommandProcessorOptions
) {
  const { startStream, stopAllStreams, getActiveStreamIds } = options;

  const processCommand = useCallback(
    async (command: string): Promise<void> => {
      switch (command.trim()) {
        case COMMANDS.HELP:
          const cli = meow(
            `
Friday CLI - AI Assistant Terminal

Usage
  $ friday-cli

Commands
  /help     Show this help message
  /clear    Clear chat history and reset to initial state
  /login    Authenticate with Google OAuth
  /logout   Sign out and clear authentication
  /auth     Show current authentication status
  /exit     Exit the application

Features
  Shift+Tab        Switch between chat and code modes
  Up/Down arrows   Navigate command history
  ESC             Stop streaming responses or exit command mode
  /               Enter command mode with auto-completion

Examples
  Type a message to chat with the AI
  Use /clear to start fresh
  Use /login to authenticate with your Google account`,
            {
              importMeta: import.meta,
              flags: {
                help: {
                  type: 'boolean',
                  shortFlag: 'h',
                },
              },
            }
          );

          actions.addMessage({
            id: generateId(),
            type: MESSAGE_TYPE.SYSTEM,
            content: cli.help.trim(),
            timestamp: new Date(),
            color: 'gray',
          });
          break;

        case COMMANDS.CLEAR:
          actions.clearHistory();
          actions.addMessage({
            id: generateId(),
            type: MESSAGE_TYPE.SYSTEM,
            content: '🧹 Chat history cleared! Starting fresh.',
            timestamp: new Date(),
          });
          break;

        case COMMANDS.EXIT:
          actions.addMessage({
            id: generateId(),
            type: MESSAGE_TYPE.SYSTEM,
            content: 'Goodbye from Friday! 👋',
            timestamp: new Date(),
          });
          process.exit(0);

        case COMMANDS.LOGIN:
          await handleLogin(actions);
          break;

        case COMMANDS.LOGOUT:
          await handleLogout(actions);
          break;

        case COMMANDS.AUTH:
          handleAuthStatus(actions);
          break;

        default:
          actions.addMessage({
            id: generateId(),
            type: MESSAGE_TYPE.SYSTEM,
            content: `❌ Unknown command: ${command}. Type /help for available commands.`,
            timestamp: new Date(),
          });
      }
    },
    [actions, stopAllStreams, getActiveStreamIds]
  );

  const processMessage = useCallback(
    async (message: string, currentMode: Mode): Promise<void> => {
      if (message.startsWith('/')) {
        await processCommand(message);
      } else {
        await startStream(message, currentMode);
      }
    },
    [processCommand, startStream]
  );

  return { processMessage, processCommand };
}

async function handleLogin(actions: AppActions): Promise<void> {
  actions.setAuthLoading(true);

  const loadingMessage: AuthMessage = {
    id: generateId(),
    type: MESSAGE_TYPE.AUTH,
    authType: 'loading',
    content: '🌐 Starting AgentCore OAuth login...',
    timestamp: new Date(),
  };
  actions.addMessage(loadingMessage);

  try {
    const result = await googleLogin();

    if (result.success) {
      const authStatus = getAuthStatus();
      if (authStatus.authenticated && authStatus.user?.user_info) {
        actions.setAuthSuccess(
          authStatus.user.user_info as AuthState['user'],
          authStatus.user.access_token
        );

        const successMessage: AuthMessage = {
          id: generateId(),
          type: MESSAGE_TYPE.AUTH,
          authType: 'success',
          content: result.message,
          timestamp: new Date(),
          metadata: {
            user: {
              ...authStatus.user.user_info,
              id: authStatus.user.user_id,
            },
            provider: 'google',
          },
        };
        actions.addMessage(successMessage);
      } else {
        const partialSuccessMessage: AuthMessage = {
          id: generateId(),
          type: MESSAGE_TYPE.AUTH,
          authType: 'success',
          content: result.message,
          timestamp: new Date(),
        };
        actions.addMessage(partialSuccessMessage);
      }
    } else {
      actions.setAuthError(result.message);
      const errorMessage: AuthMessage = {
        id: generateId(),
        type: MESSAGE_TYPE.AUTH,
        authType: 'error',
        content: result.message,
        timestamp: new Date(),
        metadata: { error: result.message },
      };
      actions.addMessage(errorMessage);
    }
  } catch (error) {
    const errorMsg = `Login error: ${error}`;
    actions.setAuthError(errorMsg);
    const errorMessage: AuthMessage = {
      id: generateId(),
      type: MESSAGE_TYPE.AUTH,
      authType: 'error',
      content: errorMsg,
      timestamp: new Date(),
      metadata: { error: errorMsg },
    };
    actions.addMessage(errorMessage);
  }
}

async function handleLogout(actions: AppActions): Promise<void> {
  try {
    const result = await logout();
    actions.clearAuth();

    const logoutMessage: AuthMessage = {
      id: generateId(),
      type: MESSAGE_TYPE.AUTH,
      authType: 'success',
      content: result.message,
      timestamp: new Date(),
    };
    actions.addMessage(logoutMessage);
  } catch (error) {
    const errorMsg = `Logout error: ${error}`;
    actions.setAuthError(errorMsg);
    const errorMessage: AuthMessage = {
      id: generateId(),
      type: MESSAGE_TYPE.AUTH,
      authType: 'error',
      content: errorMsg,
      timestamp: new Date(),
      metadata: { error: errorMsg },
    };
    actions.addMessage(errorMessage);
  }
}

function handleAuthStatus(actions: AppActions): void {
  const authStatus = getAuthStatus();
  let statusContent: string;
  let statusMetadata: AuthMessage['metadata'] = undefined;

  if (authStatus.authenticated && authStatus.user?.user_info) {
    const userInfo = authStatus.user.user_info;
    statusContent = `✅ Authenticated as ${userInfo.name || 'Unknown'} (${
      userInfo.email || 'Unknown'
    })`;
    statusMetadata = {
      user: {
        ...userInfo,
        id: userInfo.email || userInfo.name || 'unknown',
      },
      provider: 'google',
    };
  } else {
    statusContent = '🔒 Not authenticated. Use /login to authenticate.';
  }

  const statusMessage: AuthMessage = {
    id: generateId(),
    type: MESSAGE_TYPE.AUTH,
    authType: 'status',
    content: statusContent,
    timestamp: new Date(),
    metadata: statusMetadata,
  };
  actions.addMessage(statusMessage);
}
