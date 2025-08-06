import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import { AppState, AppActions, ChatMessage, Mode, modes, AuthState } from '../types.js';
import { getAuthStatus, getToken } from '../services/oauth.js';

// Initial state
const initialState: AppState = {
  currentMode: 'text',
  chatHistory: [],
  currentInput: '',
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
  // Enhanced auth actions
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_AUTH_ERROR'; payload: string | null }
  | { type: 'SET_AUTH_SUCCESS'; payload: { user: AuthState['user']; token: string } }
  | { type: 'CLEAR_AUTH' }
  // Legacy auth actions (for backward compatibility)
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_USER_INFO'; payload: any };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, currentMode: action.payload };

    case 'SWITCH_MODE':
      const currentIndex = modes.indexOf(state.currentMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { ...state, currentMode: modes[nextIndex]! };

    case 'ADD_MESSAGE':
      const newHistory = [...state.chatHistory, action.payload];
      // Keep last 100 messages
      const trimmedHistory =
        newHistory.length > 100 ? newHistory.slice(-100) : newHistory;
      return { ...state, chatHistory: trimmedHistory };

    case 'CLEAR_HISTORY':
      return { ...state, chatHistory: [] };

    case 'SET_CURRENT_INPUT':
      return { ...state, currentInput: action.payload };

    case 'ADD_TO_COMMAND_HISTORY':
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

    case 'NAVIGATE_HISTORY':
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

    // Enhanced auth cases
    case 'SET_AUTH_LOADING':
      return {
        ...state,
        auth: { ...state.auth, isLoading: action.payload, error: null },
      };

    case 'SET_AUTH_ERROR':
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

    case 'SET_AUTH_SUCCESS':
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

    case 'CLEAR_AUTH':
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
    case 'SET_AUTHENTICATED':
      return { 
        ...state, 
        isAuthenticated: action.payload,
        auth: { ...state.auth, isAuthenticated: action.payload }
      };

    case 'SET_USER_INFO':
      return { 
        ...state, 
        userInfo: action.payload,
        auth: { ...state.auth, user: action.payload }
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
    dispatch({ type: 'SWITCH_MODE' });
  }, []);

  const setMode = useCallback((mode: Mode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);

  const setCurrentInput = useCallback((input: string) => {
    dispatch({ type: 'SET_CURRENT_INPUT', payload: input });
  }, []);

  const addToCommandHistory = useCallback((command: string) => {
    dispatch({ type: 'ADD_TO_COMMAND_HISTORY', payload: command });
  }, []);

  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    dispatch({ type: 'NAVIGATE_HISTORY', payload: direction });
  }, []);

  const setAuthenticated = useCallback((isAuth: boolean) => {
    dispatch({ type: 'SET_AUTHENTICATED', payload: isAuth });
  }, []);

  const setUserInfo = useCallback((user: any) => {
    dispatch({ type: 'SET_USER_INFO', payload: user });
  }, []);

  // Enhanced auth action handlers
  const setAuthLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_AUTH_LOADING', payload: loading });
  }, []);

  const setAuthError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_AUTH_ERROR', payload: error });
  }, []);

  const setAuthSuccess = useCallback((user: AuthState['user'], token: string) => {
    dispatch({ type: 'SET_AUTH_SUCCESS', payload: { user, token } });
  }, []);

  const clearAuth = useCallback(() => {
    dispatch({ type: 'CLEAR_AUTH' });
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
