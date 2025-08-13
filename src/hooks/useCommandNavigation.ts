import { useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext.js';
import { COMMANDS } from '../utils/constants.js';

interface Command {
  name: string;
  description: string;
  usage: string;
}

// Available commands with descriptions
const AVAILABLE_COMMANDS: Command[] = [
  {
    name: COMMANDS.HELP,
    description: 'Show available commands and features',
    usage: '/help',
  },
  {
    name: COMMANDS.LOGIN,
    description: 'Authenticate with AgentCore using Google OAuth',
    usage: '/login',
  },
  {
    name: COMMANDS.LOGOUT,
    description: 'Sign out from the current session',
    usage: '/logout',
  },
  {
    name: COMMANDS.AUTH,
    description: 'Check current authentication status',
    usage: '/auth',
  },
  {
    name: COMMANDS.CLEAR,
    description: 'Clear chat history and reset to initial state',
    usage: '/clear',
  },
  {
    name: COMMANDS.EXIT,
    description: 'Exit the Friday CLI application',
    usage: '/exit',
  },
];

export function useCommandNavigation() {
  const { state, actions } = useApp();
  const { commandQuery, selectedCommandIndex, isCommandMode } = state;

  // Filter commands based on query
  const filteredCommands = useCallback(() => {
    if (!commandQuery.trim()) {
      return AVAILABLE_COMMANDS;
    }

    const query = commandQuery.toLowerCase().replace('/', '');
    return AVAILABLE_COMMANDS.filter(
      command =>
        command.name.toLowerCase().includes(query) ||
        command.description.toLowerCase().includes(query)
    );
  }, [commandQuery]);

  // Navigate command list
  const navigateCommandList = useCallback(
    (direction: 'up' | 'down') => {
      if (!isCommandMode) return;

      const commands = filteredCommands();
      if (commands.length === 0) return;

      const currentIndex = selectedCommandIndex;
      let newIndex: number;

      if (direction === 'up') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : commands.length - 1;
      } else {
        newIndex = currentIndex < commands.length - 1 ? currentIndex + 1 : 0;
      }

      actions.setSelectedCommandIndex(newIndex);
    },
    [isCommandMode, selectedCommandIndex, filteredCommands, actions]
  );

  // Get currently selected command
  const getSelectedCommand = useCallback(() => {
    const commands = filteredCommands();
    if (commands.length === 0 || selectedCommandIndex >= commands.length) {
      return null;
    }
    return commands[selectedCommandIndex];
  }, [filteredCommands, selectedCommandIndex]);

  // Auto-select command when it's the only match
  useEffect(() => {
    if (!isCommandMode) return;

    const commands = filteredCommands();
    if (commands.length === 1 && selectedCommandIndex !== 0) {
      actions.setSelectedCommandIndex(0);
    }
  }, [
    commandQuery,
    isCommandMode,
    filteredCommands,
    selectedCommandIndex,
    actions,
  ]);

  return {
    filteredCommands: filteredCommands(),
    navigateCommandList,
    getSelectedCommand,
    selectedCommandIndex: Math.min(
      selectedCommandIndex,
      filteredCommands().length - 1
    ),
  };
}
