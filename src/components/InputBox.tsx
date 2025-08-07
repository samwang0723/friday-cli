import React, { useCallback, useMemo, memo } from 'react';
import { Box, Text, useInput } from 'ink';
import { useApp } from '../context/AppContext.js';
import { ChatMessage, ActionMessage } from '../types.js';
import { MESSAGE_TYPE, ACTION_TYPE } from '../utils/constants.js';
import { useStreamingSession } from '../hooks/useStreamingSession.js';
import { useCommandProcessor } from '../hooks/useCommandProcessor.js';

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const InputBox = memo(function InputBox() {
  const { state, actions } = useApp();
  const { currentInput, currentMode } = state;
  const { startStream, stopAllStreams, getActiveStreamIds, isStreaming } =
    useStreamingSession();

  const { processMessage } = useCommandProcessor(actions, {
    startStream,
    stopAllStreams,
    getActiveStreamIds,
    isStreaming,
  });

  // Keyboard handler that uses state directly instead of refs
  const handleKeyInput = useCallback(
    (
      input: string,
      key: {
        return?: boolean;
        ctrl?: boolean;
        meta?: boolean;
        [key: string]: unknown;
      }
    ) => {
      // Handle regular Enter for submit
      if (key.return) {
        if (!currentInput.trim()) return;

        // Inline submit logic to avoid circular dependency
        const userMessage: ChatMessage = {
          id: generateId(),
          type: MESSAGE_TYPE.USER,
          content: currentInput,
          timestamp: new Date(),
        };
        actions.addMessage(userMessage);
        actions.addToCommandHistory(currentInput);
        processMessage(currentInput, currentMode);
        actions.setCurrentInput('');
        return;
      }

      if (key.shift && key.tab) {
        actions.switchMode();
        return;
      }

      if (key.upArrow) {
        actions.navigateHistory('up');
        return;
      }

      if (key.downArrow) {
        actions.navigateHistory('down');
        return;
      }

      // Enhanced backspace handling
      if (key.backspace || key.delete) {
        if (currentInput.length > 0) {
          actions.setCurrentInput(currentInput.slice(0, -1));
        }
        return;
      }

      if (key.ctrl && key.c) {
        process.exit(0);
        return;
      }

      // Handle ESC key to stop all active streams
      if (key.escape) {
        const activeStreamIds = getActiveStreamIds();
        if (activeStreamIds.length > 0) {
          // Remove streaming messages instead of marking them as stopped
          actions.removeStreamingMessages(activeStreamIds);

          // Add a nested action message under the last user input
          const nestedStopMessage: ActionMessage = {
            id: generateId(),
            type: MESSAGE_TYPE.ACTION,
            actionType: ACTION_TYPE.NESTED,
            content: 'Interrupted by user',
            timestamp: new Date(),
          };

          actions.addMessage(nestedStopMessage, 'red');
        }
        return;
      }

      // Handle printable characters (check if it's a valid single character)
      if (input && input.length === 1 && !key.ctrl && !key.meta && !key.alt) {
        actions.setCurrentInput(currentInput + input);
      }
    },
    [
      actions,
      currentInput,
      currentMode,
      processMessage,
      getActiveStreamIds,
      stopAllStreams,
    ]
  ); // Depend on current state for immediate access

  // Handle keyboard input
  useInput(handleKeyInput, {
    isActive: true,
  });

  // Memoize input display for performance
  const inputDisplay = useMemo(() => {
    const inputLines = currentInput.split('\n');
    const displayLines = inputLines.slice(-10); // Show max 3 lines

    return (
      <Box flexDirection="column" width="100%" marginX={1}>
        {displayLines.map((line, index) => (
          <Box key={index}>
            <Text>{line}</Text>
          </Box>
        ))}
      </Box>
    );
  }, [currentInput]);

  return (
    <Box borderStyle="round" borderColor="blue" paddingX={1}>
      <Text color="blue">{'>'}</Text>
      {inputDisplay}
    </Box>
  );
});
