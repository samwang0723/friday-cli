import React, { useCallback, useMemo, memo, useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useApp } from '../context/AppContext.js';
import { ChatMessage, ActionMessage } from '../types.js';
import { MESSAGE_TYPE, ACTION_TYPE } from '../utils/constants.js';
import { useStreamingSession } from '../hooks/useStreamingSession.js';
import { useCommandProcessor } from '../hooks/useCommandProcessor.js';

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function normalizePastedText(raw: string): string {
  const ESC = '\u001B';
  // Strip bracketed paste mode markers if present
  let text = raw
    .split(`${ESC}[200~`)
    .join('')
    .split(`${ESC}[201~`)
    .join('')
    .split('[200~')
    .join('')
    .split('[201~')
    .join('');
  // Normalize newlines without regex
  text = text.split('\r\n').join('\n').split('\r').join('\n');
  return text;
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

  // Cursor position within currentInput (in characters)
  const [cursorIndex, setCursorIndex] = useState<number>(
    () => currentInput.length
  );

  // Enable bracketed paste mode so pasted content arrives as a single chunk
  useEffect(() => {
    if (process.stdout && process.stdout.isTTY) {
      try {
        process.stdout.write('\x1b[?2004h');
      } catch {
        // no-op
      }
      return () => {
        try {
          process.stdout.write('\x1b[?2004l');
        } catch {
          // no-op
        }
      };
    }
    return undefined;
  }, []);

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
        setCursorIndex(0);
        return;
      }

      if (key.shift && key.tab) {
        actions.switchMode();
        return;
      }

      if (key.upArrow) {
        actions.navigateHistory('up');
        setCursorIndex(Number.MAX_SAFE_INTEGER);
        return;
      }

      if (key.downArrow) {
        actions.navigateHistory('down');
        setCursorIndex(Number.MAX_SAFE_INTEGER);
        return;
      }

      // Move cursor left/right
      if (key.leftArrow) {
        setCursorIndex(index => Math.max(0, index - 1));
        return;
      }

      if (key.rightArrow) {
        setCursorIndex(index => Math.min(currentInput.length, index + 1));
        return;
      }

      // Home / End (Ctrl+A / Ctrl+E as common terminal bindings)
      if (key.ctrl && (input === 'a' || input === 'A')) {
        setCursorIndex(0);
        return;
      }
      if (key.ctrl && (input === 'e' || input === 'E')) {
        setCursorIndex(currentInput.length);
        return;
      }

      // Backspace: delete character before cursor
      if ((key as { backspace?: boolean }).backspace) {
        const index = Math.min(cursorIndex, currentInput.length);
        if (index > 0) {
          const updated =
            currentInput.slice(0, index - 1) + currentInput.slice(index);
          actions.setCurrentInput(updated);
          setCursorIndex(index - 1);
        }
        return;
      }

      // Delete: always delete character BEFORE the cursor (same as Backspace)
      if ((key as { delete?: boolean }).delete) {
        const index = Math.min(cursorIndex, currentInput.length);
        if (index > 0) {
          const updated =
            currentInput.slice(0, index - 1) + currentInput.slice(index);
          actions.setCurrentInput(updated);
          setCursorIndex(index - 1);
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
      // First, handle multi-character input (likely paste)
      const isBracketedPaste = Boolean(
        input &&
          (input.includes('\x1b[200~') ||
            input.includes('\x1b[201~') ||
            input.includes('[200~') ||
            input.includes('[201~'))
      );
      if (
        input &&
        (input.length > 1 || isBracketedPaste) &&
        !key.ctrl &&
        !key.meta &&
        !key.alt
      ) {
        const index = Math.min(cursorIndex, currentInput.length);
        const pasted = normalizePastedText(input);
        const updated =
          currentInput.slice(0, index) + pasted + currentInput.slice(index);
        actions.setCurrentInput(updated);
        setCursorIndex(index + pasted.length);
        return;
      }

      if (input && input.length === 1 && !key.ctrl && !key.meta && !key.alt) {
        const index = Math.min(cursorIndex, currentInput.length);
        const updated =
          currentInput.slice(0, index) + input + currentInput.slice(index);
        actions.setCurrentInput(updated);
        setCursorIndex(index + 1);
      }
    },
    [
      actions,
      currentInput,
      currentMode,
      processMessage,
      getActiveStreamIds,
      stopAllStreams,
      cursorIndex,
    ]
  ); // Depend on current state for immediate access

  // Handle keyboard input
  useInput(handleKeyInput, {
    isActive: true,
  });

  // Memoize input display with a visible cursor
  const inputDisplay = useMemo(() => {
    const index = Math.min(cursorIndex, currentInput.length);
    const before = currentInput.slice(0, index);
    const cursorChar = currentInput[index] ?? ' ';
    const after =
      index < currentInput.length ? currentInput.slice(index + 1) : '';

    return (
      <Box flexDirection="row" width="100%" marginX={1}>
        <Text>{before}</Text>
        <Text inverse>{cursorChar}</Text>
        <Text>{after}</Text>
      </Box>
    );
  }, [currentInput, cursorIndex]);

  return (
    <Box borderStyle="round" borderColor="blue" paddingX={1}>
      <Text color="blue">{'>'}</Text>
      {inputDisplay}
    </Box>
  );
});
