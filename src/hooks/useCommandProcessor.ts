import { useCallback } from 'react';
import { AppActions, AuthMessage, AuthState, Mode } from '../types.js';
import { googleLogin, logout, getAuthStatus } from '../services/oauth.js';
import { COMMANDS, MESSAGE_TYPE } from '../utils/constants.js';

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  const processCommand = useCallback(async (command: string): Promise<void> => {
    switch (command.trim()) {
      case COMMANDS.HELP:
        const helpMessages = [
          'Available commands: /help, /login, /logout, /auth, /exit',
          'Features: Shift+Tab to switch modes, Up/Down for history, ESC to stop streams',
          '⚠️  Note: Make sure AgentCore backend is running for authentication'
        ];
        
        helpMessages.forEach(content => {
          actions.addMessage({
            id: generateId(),
            type: MESSAGE_TYPE.SYSTEM,
            content,
            timestamp: new Date(),
          });
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
  }, [actions, stopAllStreams, getActiveStreamIds]);

  const processMessage = useCallback(async (
    message: string,
    currentMode: Mode
  ): Promise<void> => {
    if (message.startsWith('/')) {
      await processCommand(message);
    } else {
      await startStream(message, currentMode);
    }
  }, [processCommand, startStream]);

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

