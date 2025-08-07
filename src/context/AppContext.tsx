import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import {
  AppState,
  AppActions,
  ChatMessage,
  Mode,
  modes,
  AuthState,
  ConnectionStatus,
  StreamingSession,
} from '../types.js';
import { getAuthStatus, getToken } from '../services/oauth.js';
import { APP_ACTIONS, OAUTH_CONFIG } from '../utils/constants.js';
import { AgentCoreService } from '../services/agentcore.js';

// Initial state
const initialState: AppState = {
  currentMode: 'text',
  chatHistory: [],
  currentInput: '',
  streaming: {
    activeStreams: new Map(),
    connectionStatus: 'disconnected',
    canStop: false,
    isInitialized: false,
  },
  commandHistory: [],
  historyIndex: -1,
  auth: {
    isAuthenticated: false,
    isLoading: false,
    error: null,
    user: null,
    token: null,
  },
  // Legacy fields for backward compatibility
  isAuthenticated: false,
  userInfo: null,
};

// Action types
type AppAction =
  | { type: 'SET_MODE'; payload: Mode }
  | { type: 'SWITCH_MODE' }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_CURRENT_INPUT'; payload: string }
  | { type: 'ADD_TO_COMMAND_HISTORY'; payload: string }
  | { type: 'NAVIGATE_HISTORY'; payload: 'up' | 'down' }
  // Streaming actions
  | {
      type: 'START_STREAMING';
      payload: {
        type: 'thinking' | 'response' | 'connection';
        messageId: string;
      };
    }
  | {
      type: 'UPDATE_STREAMING_CONTENT';
      payload: { messageId: string; partialContent: string };
    }
  | {
      type: 'COMPLETE_STREAMING';
      payload: { messageId: string; finalContent?: string };
    }
  | { type: 'STOP_STREAMING'; payload: { messageId: string } }
  | { type: 'REMOVE_STREAMING_MESSAGES'; payload: string[] }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'INITIALIZE_CHAT_COMPLETE'; payload: boolean }
  // Enhanced auth actions
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_AUTH_ERROR'; payload: string | null }
  | {
      type: 'SET_AUTH_SUCCESS';
      payload: { user: AuthState['user']; token: string };
    }
  | { type: 'CLEAR_AUTH' }
  // Legacy auth actions (for backward compatibility)
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_USER_INFO'; payload: AuthState['user'] };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case APP_ACTIONS.SET_MODE:
      return { ...state, currentMode: action.payload };

    case APP_ACTIONS.SWITCH_MODE:
      const currentIndex = modes.indexOf(state.currentMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { ...state, currentMode: modes[nextIndex]! };

    case APP_ACTIONS.ADD_MESSAGE:
      const newHistory = [...state.chatHistory, action.payload];
      // Keep last 100 messages
      const trimmedHistory =
        newHistory.length > 100 ? newHistory.slice(-100) : newHistory;
      return { ...state, chatHistory: trimmedHistory };

    case APP_ACTIONS.CLEAR_HISTORY:
      return { ...state, chatHistory: [] };

    case APP_ACTIONS.SET_CURRENT_INPUT:
      return { ...state, currentInput: action.payload };

    case APP_ACTIONS.ADD_TO_COMMAND_HISTORY:
      const newCommandHistory = [...state.commandHistory, action.payload];
      // Keep last 50 commands
      const trimmedCommands =
        newCommandHistory.length > 50
          ? newCommandHistory.slice(-50)
          : newCommandHistory;
      return {
        ...state,
        commandHistory: trimmedCommands,
        historyIndex: -1, // Reset index
      };

    case APP_ACTIONS.NAVIGATE_HISTORY:
      if (action.payload === 'up' && state.commandHistory.length > 0) {
        const newIndex = Math.min(
          state.historyIndex + 1,
          state.commandHistory.length - 1
        );
        const command =
          state.commandHistory[state.commandHistory.length - 1 - newIndex] ||
          '';
        return {
          ...state,
          historyIndex: newIndex,
          currentInput: command,
        };
      } else if (action.payload === 'down') {
        if (state.historyIndex > 0) {
          const newIndex = state.historyIndex - 1;
          const command =
            state.commandHistory[state.commandHistory.length - 1 - newIndex] ||
            '';
          return {
            ...state,
            historyIndex: newIndex,
            currentInput: command,
          };
        } else {
          return {
            ...state,
            historyIndex: -1,
            currentInput: '',
          };
        }
      }
      return state;

    // Streaming cases
    case 'START_STREAMING': {
      const { type, messageId } = action.payload;
      const newActiveStreams = new Map(state.streaming.activeStreams);
      const streamingSession: StreamingSession = {
        id: crypto.randomUUID(),
        type,
        messageId,
        startTime: new Date(),
      };
      newActiveStreams.set(messageId, streamingSession);

      return {
        ...state,
        streaming: {
          ...state.streaming,
          activeStreams: newActiveStreams,
          canStop: true,
        },
      };
    }

    case 'UPDATE_STREAMING_CONTENT': {
      const { messageId, partialContent } = action.payload;
      const updatedHistory = state.chatHistory.map(msg => {
        if (msg.id === messageId && msg.type === 'streaming') {
          return {
            ...msg,
            partialContent,
            content: partialContent, // For backward compatibility
          };
        }
        return msg;
      });

      return {
        ...state,
        chatHistory: updatedHistory,
      };
    }

    case 'COMPLETE_STREAMING': {
      const { messageId, finalContent } = action.payload;
      const newActiveStreams = new Map(state.streaming.activeStreams);
      newActiveStreams.delete(messageId);

      const updatedHistory = state.chatHistory.map(msg => {
        if (msg.id === messageId && msg.type === 'streaming') {
          return {
            ...msg,
            partialContent: finalContent || msg.partialContent,
            content: finalContent || msg.partialContent,
            isComplete: true,
            canStop: false,
          };
        }
        return msg;
      });

      return {
        ...state,
        chatHistory: updatedHistory,
        streaming: {
          ...state.streaming,
          activeStreams: newActiveStreams,
          canStop: newActiveStreams.size > 0,
        },
      };
    }

    case 'STOP_STREAMING': {
      const { messageId } = action.payload;
      const newActiveStreams = new Map(state.streaming.activeStreams);
      const session = newActiveStreams.get(messageId);

      if (session?.abortController) {
        session.abortController.abort();
      }
      newActiveStreams.delete(messageId);

      const updatedHistory = state.chatHistory.map(msg => {
        if (msg.id === messageId && msg.type === 'streaming') {
          return {
            ...msg,
            isComplete: true,
            canStop: false,
            partialContent: msg.partialContent + ' [Stopped by user]',
            content: msg.content + ' [Stopped by user]',
          };
        }
        return msg;
      });

      return {
        ...state,
        chatHistory: updatedHistory,
        streaming: {
          ...state.streaming,
          activeStreams: newActiveStreams,
          canStop: newActiveStreams.size > 0,
        },
      };
    }

    case 'REMOVE_STREAMING_MESSAGES': {
      const messageIdsToRemove = action.payload;
      const filteredHistory = state.chatHistory.filter(
        msg => !(msg.type === 'streaming' && messageIdsToRemove.includes(msg.id))
      );
      
      // Also clean up active streams
      const newActiveStreams = new Map(state.streaming.activeStreams);
      messageIdsToRemove.forEach(id => {
        const session = newActiveStreams.get(id);
        if (session?.abortController) {
          session.abortController.abort();
        }
        newActiveStreams.delete(id);
      });

      return {
        ...state,
        chatHistory: filteredHistory,
        streaming: {
          ...state.streaming,
          activeStreams: newActiveStreams,
          canStop: newActiveStreams.size > 0,
        },
      };
    }

    case 'SET_CONNECTION_STATUS': {
      return {
        ...state,
        streaming: {
          ...state.streaming,
          connectionStatus: action.payload,
        },
      };
    }

    case 'INITIALIZE_CHAT_COMPLETE': {
      return {
        ...state,
        streaming: {
          ...state.streaming,
          isInitialized: action.payload,
        },
      };
    }

    // Enhanced auth cases
    case APP_ACTIONS.SET_AUTH_LOADING:
      return {
        ...state,
        auth: { ...state.auth, isLoading: action.payload, error: null },
      };

    case APP_ACTIONS.SET_AUTH_ERROR:
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: false,
          error: action.payload,
          isAuthenticated: false,
          user: null,
          token: null,
        },
        isAuthenticated: false,
        userInfo: null,
      };

    case APP_ACTIONS.SET_AUTH_SUCCESS:
      return {
        ...state,
        auth: {
          isAuthenticated: true,
          isLoading: false,
          error: null,
          user: action.payload.user,
          token: action.payload.token,
        },
        isAuthenticated: true,
        userInfo: action.payload.user,
      };

    case APP_ACTIONS.CLEAR_AUTH:
      return {
        ...state,
        auth: {
          isAuthenticated: false,
          isLoading: false,
          error: null,
          user: null,
          token: null,
        },
        isAuthenticated: false,
        userInfo: null,
      };

    // Legacy auth cases (for backward compatibility)
    case APP_ACTIONS.SET_AUTHENTICATED:
      return {
        ...state,
        isAuthenticated: action.payload,
        auth: { ...state.auth, isAuthenticated: action.payload },
      };

    case APP_ACTIONS.SET_USER_INFO:
      return {
        ...state,
        userInfo: action.payload,
        auth: { ...state.auth, user: action.payload },
      };

    default:
      return state;
  }
}

// Context
const AppContext = createContext<
  | {
      state: AppState;
      actions: AppActions;
    }
  | undefined
>(undefined);

// Provider
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Create stable action handlers using useCallback outside of useMemo
  const switchMode = useCallback(() => {
    dispatch({ type: APP_ACTIONS.SWITCH_MODE });
  }, []);

  const setMode = useCallback((mode: Mode) => {
    dispatch({ type: APP_ACTIONS.SET_MODE, payload: mode });
  }, []);

  const addMessage = useCallback((message: ChatMessage, color?: string) => {
    const messageWithColor = color ? { ...message, color } : message;
    dispatch({ type: APP_ACTIONS.ADD_MESSAGE, payload: messageWithColor });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: APP_ACTIONS.CLEAR_HISTORY });
  }, []);

  const setCurrentInput = useCallback((input: string) => {
    dispatch({ type: APP_ACTIONS.SET_CURRENT_INPUT, payload: input });
  }, []);

  const addToCommandHistory = useCallback((command: string) => {
    dispatch({ type: APP_ACTIONS.ADD_TO_COMMAND_HISTORY, payload: command });
  }, []);

  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    dispatch({ type: APP_ACTIONS.NAVIGATE_HISTORY, payload: direction });
  }, []);

  const setAuthenticated = useCallback((isAuth: boolean) => {
    dispatch({ type: APP_ACTIONS.SET_AUTHENTICATED, payload: isAuth });
  }, []);

  const setUserInfo = useCallback((user: AuthState['user']) => {
    dispatch({ type: APP_ACTIONS.SET_USER_INFO, payload: user });
  }, []);

  // Enhanced auth action handlers
  const setAuthLoading = useCallback((loading: boolean) => {
    dispatch({ type: APP_ACTIONS.SET_AUTH_LOADING, payload: loading });
  }, []);

  const setAuthError = useCallback((error: string | null) => {
    dispatch({ type: APP_ACTIONS.SET_AUTH_ERROR, payload: error });
  }, []);

  const setAuthSuccess = useCallback(
    (user: AuthState['user'], token: string) => {
      dispatch({
        type: APP_ACTIONS.SET_AUTH_SUCCESS,
        payload: { user, token },
      });
    },
    []
  );

  const clearAuth = useCallback(() => {
    dispatch({ type: APP_ACTIONS.CLEAR_AUTH });
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const authStatus = getAuthStatus();
      if (authStatus.authenticated && authStatus.user) {
        const token = getToken();
        if (token) {
          setAuthSuccess(authStatus.user.user_info as AuthState['user'], token);
        }
      } else {
        clearAuth();
      }
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setAuthError('Failed to refresh authentication');
    }
  }, [setAuthSuccess, clearAuth, setAuthError]);

  // Streaming action handlers
  const startStreaming = useCallback(
    (type: 'thinking' | 'response' | 'connection', messageId: string) => {
      dispatch({ type: 'START_STREAMING', payload: { type, messageId } });
    },
    []
  );

  const updateStreamingContent = useCallback(
    (messageId: string, partialContent: string) => {
      dispatch({
        type: 'UPDATE_STREAMING_CONTENT',
        payload: { messageId, partialContent },
      });
    },
    []
  );

  const completeStreaming = useCallback(
    (messageId: string, finalContent?: string) => {
      dispatch({
        type: 'COMPLETE_STREAMING',
        payload: { messageId, finalContent },
      });
    },
    []
  );

  const stopStreaming = useCallback((messageId: string) => {
    dispatch({ type: 'STOP_STREAMING', payload: { messageId } });
  }, []);

  const removeStreamingMessages = useCallback((messageIds: string[]) => {
    dispatch({ type: 'REMOVE_STREAMING_MESSAGES', payload: messageIds });
  }, []);

  const setConnectionStatus = useCallback((status: ConnectionStatus) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
  }, []);

  const initializeChat = useCallback(async () => {
    if (
      state.streaming.isInitialized ||
      !state.auth.isAuthenticated ||
      !state.auth.token
    ) {
      return;
    }

    try {
      // Create AgentCore service instance
      const agentCore = new AgentCoreService(OAUTH_CONFIG.AGENT_CORE_BASE_URL);

      // Create a connection status message
      const connectionMessageId = `connection_${Date.now()}`;
      const connectionMessage: ChatMessage = {
        id: connectionMessageId,
        type: 'streaming',
        streamingType: 'connection',
        content: '',
        partialContent: 'Connecting to AgentCore...',
        timestamp: new Date(),
        canStop: false,
        isComplete: false,
      };

      addMessage(connectionMessage);
      startStreaming('connection', connectionMessageId);
      setConnectionStatus('connecting');

      // Call chatInit with status callback
      await agentCore.chatInit(
        state.auth.token,
        (status: string) => {
          updateStreamingContent(connectionMessageId, status);
        },
        {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          clientDatetime: new Date().toISOString(),
          locale: process.env.LANG?.split('.')[0]?.replace('_', '-') || 'en',
        }
      );

      // Mark initialization as complete
      completeStreaming(
        connectionMessageId,
        'Connected to AgentCore successfully'
      );
      setConnectionStatus('connected');

      // Mark as initialized by updating the streaming state
      // const newActiveStreams = new Map(state.streaming.activeStreams);
      dispatch({
        type: 'SET_CONNECTION_STATUS',
        payload: 'connected',
      });

      // Use a custom action to mark as initialized
      dispatch({
        type: 'INITIALIZE_CHAT_COMPLETE',
        payload: true,
      });
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setConnectionStatus('error');

      // Show error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'streaming',
        streamingType: 'connection',
        content: `Failed to connect to AgentCore: ${(error as Error).message}`,
        partialContent: `Failed to connect to AgentCore: ${(error as Error).message}`,
        timestamp: new Date(),
        canStop: false,
        isComplete: true,
      };

      addMessage(errorMessage);
    }
  }, [
    state.streaming.isInitialized,
    state.auth.isAuthenticated,
    state.auth.token,
    addMessage,
    startStreaming,
    updateStreamingContent,
    completeStreaming,
    setConnectionStatus,
  ]);

  const actions: AppActions = useMemo(
    () => ({
      switchMode,
      setMode,
      addMessage,
      clearHistory,
      setCurrentInput,
      addToCommandHistory,
      navigateHistory,
      // Enhanced auth actions
      setAuthLoading,
      setAuthError,
      setAuthSuccess,
      clearAuth,
      refreshAuth,
      // Streaming actions
      startStreaming,
      updateStreamingContent,
      completeStreaming,
      stopStreaming,
      removeStreamingMessages,
      setConnectionStatus,
      initializeChat,
      // Legacy auth actions
      setAuthenticated,
      setUserInfo,
    }),
    [
      switchMode,
      setMode,
      addMessage,
      clearHistory,
      setCurrentInput,
      addToCommandHistory,
      navigateHistory,
      setAuthLoading,
      setAuthError,
      setAuthSuccess,
      clearAuth,
      refreshAuth,
      startStreaming,
      updateStreamingContent,
      completeStreaming,
      stopStreaming,
      removeStreamingMessages,
      setConnectionStatus,
      initializeChat,
      setAuthenticated,
      setUserInfo,
    ]
  );

  // Initialize authentication state on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await refreshAuth();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      }
    };

    initializeAuth();
  }, [refreshAuth]);

  // Auto-initialize chat when authentication becomes successful
  useEffect(() => {
    if (
      state.auth.isAuthenticated &&
      state.auth.token &&
      !state.streaming.isInitialized
    ) {
      // console.info('Authentication successful, initializing chat...');
      initializeChat();
    }
  }, [
    state.auth.isAuthenticated,
    state.auth.token,
    state.streaming.isInitialized,
    initializeChat,
  ]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

// Hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
