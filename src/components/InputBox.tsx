import React, { useCallback, useMemo, memo, useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useApp } from '../context/AppContext.js';
import { ChatMessage, ActionMessage } from '../types.js';
import { useCommandNavigation } from '../hooks/useCommandNavigation.js';
import { useFileNavigation } from '../hooks/useFileNavigation.js';
import { MESSAGE_TYPE, ACTION_TYPE } from '../utils/constants.js';
import { useStreamingSession } from '../hooks/useStreamingSession.js';
import { useCommandProcessor } from '../hooks/useCommandProcessor.js';
import {
  processMessageWithFileContext,
  extractFileReferences,
  readFileContentWithMetadata,
} from '../utils/fileReader.js';

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
  const { currentInput, currentMode, isCommandMode, isFileMode } = state;
  const { startStream, stopAllStreams, getActiveStreamIds, isStreaming } =
    useStreamingSession();

  const { processMessage } = useCommandProcessor(actions, {
    startStream,
    stopAllStreams,
    getActiveStreamIds,
    isStreaming,
  });

  const { navigateCommandList, getSelectedCommand } = useCommandNavigation();
  const { navigateFileList, getSelectedFile } = useFileNavigation();

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
        // Handle file mode selection - just update input, don't submit
        if (isFileMode) {
          const selectedFile = getSelectedFile();
          if (selectedFile) {
            // Replace the @query with the selected file path
            const atIndex = currentInput.lastIndexOf('@');
            if (atIndex !== -1) {
              // Find the end of the current query (find next space or end of string)
              let queryEndIndex = atIndex + 1;
              while (
                queryEndIndex < currentInput.length &&
                currentInput[queryEndIndex] !== ' '
              ) {
                queryEndIndex++;
              }

              const beforeAt = currentInput.slice(0, atIndex);
              const afterQuery = currentInput.slice(queryEndIndex);
              const filePathWithSlash =
                selectedFile.relativePath +
                (selectedFile.isDirectory ? '/' : '');
              const updatedInput =
                beforeAt + '@' + filePathWithSlash + afterQuery;
              actions.setCurrentInput(updatedInput);
              setCursorIndex(beforeAt.length + 1 + filePathWithSlash.length);
            }
          }
          // Exit file mode after selection
          actions.setFileMode(false);
          return; // Don't submit the message
        }

        // Handle command mode selection - replace input and submit
        if (isCommandMode) {
          const selectedCommand = getSelectedCommand();
          if (selectedCommand) {
            actions.setCurrentInput(selectedCommand.usage);
            actions.setCommandMode(false);
            // Submit the command
            const userMessage: ChatMessage = {
              id: generateId(),
              type: MESSAGE_TYPE.USER,
              content: selectedCommand.usage,
              timestamp: new Date(),
            };
            actions.addMessage(userMessage);
            actions.addToCommandHistory(selectedCommand.usage);
            processMessage(selectedCommand.usage, currentMode);
            actions.setCurrentInput('');
            setCursorIndex(0);
            return;
          }
          // Exit command mode if no selection
          actions.setCommandMode(false);
        }

        // Regular message submission
        if (!currentInput.trim()) return;

        // Process message with file context asynchronously
        const handleMessageSubmission = async () => {
          try {
            const fileReferences = extractFileReferences(currentInput);

            // Display the original user message WITH file references for clarity
            const displayMessage = currentInput;

            const userMessage: ChatMessage = {
              id: generateId(),
              type: MESSAGE_TYPE.USER,
              content: displayMessage,
              timestamp: new Date(),
            };
            actions.addMessage(userMessage);

            // Add nested action messages for each file being loaded
            for (const fileRef of fileReferences) {
              try {
                const result = await readFileContentWithMetadata(fileRef.path);
                if (result !== null) {
                  let statusText;
                  if (result.isDirectory) {
                    // For directories, use the metadata
                    statusText = `Read ${fileRef.path} (${result.fileCount} files, ${result.totalLines} lines total)`;
                  } else {
                    // For individual files
                    statusText = `Read ${fileRef.path} (${result.totalLines} lines)`;
                  }

                  const actionMessage: ActionMessage = {
                    id: generateId(),
                    type: MESSAGE_TYPE.ACTION,
                    actionType: ACTION_TYPE.NESTED,
                    content: statusText,
                    timestamp: new Date(),
                  };
                  actions.addMessage(actionMessage, 'gray');
                } else {
                  // Show error for failed file reads
                  const errorMessage: ActionMessage = {
                    id: generateId(),
                    type: MESSAGE_TYPE.ACTION,
                    actionType: ACTION_TYPE.NESTED,
                    content: `Failed to read ${fileRef.path}`,
                    timestamp: new Date(),
                  };
                  actions.addMessage(errorMessage, 'red');
                }
              } catch (error) {
                const errorMessage: ActionMessage = {
                  id: generateId(),
                  type: MESSAGE_TYPE.ACTION,
                  actionType: ACTION_TYPE.NESTED,
                  content: `Error reading ${fileRef.path}: ${error}`,
                  timestamp: new Date(),
                };
                actions.addMessage(errorMessage, 'red');
              }
            }

            // Process the message with full file content for AI
            const processedContent =
              await processMessageWithFileContext(currentInput);
            actions.addToCommandHistory(currentInput); // Keep original in history
            processMessage(processedContent, currentMode);
            actions.setCurrentInput('');
            setCursorIndex(0);
          } catch (error) {
            console.error('Error processing message with file context:', error);
            // Fallback to original message if file processing fails
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
          }
        };

        handleMessageSubmission();
        return;
      }

      if (key.shift && key.tab) {
        actions.switchMode();
        return;
      }

      if (key.upArrow) {
        if (isCommandMode) {
          navigateCommandList('up');
        } else if (isFileMode) {
          navigateFileList('up');
        } else {
          actions.navigateHistory('up');
          setCursorIndex(Number.MAX_SAFE_INTEGER);
        }
        return;
      }

      if (key.downArrow) {
        if (isCommandMode) {
          navigateCommandList('down');
        } else if (isFileMode) {
          navigateFileList('down');
        } else {
          actions.navigateHistory('down');
          setCursorIndex(Number.MAX_SAFE_INTEGER);
        }
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

          // Check what character was deleted
          const deletedChar = currentInput[index - 1];

          // Update command mode based on updated content
          const startsWithSlash = updated.startsWith('/');
          if (isCommandMode) {
            if (!startsWithSlash || deletedChar === '/') {
              actions.setCommandMode(false);
            } else {
              actions.setCommandQuery(updated);
            }
          }

          // Update file mode based on updated content
          if (isFileMode) {
            const hasAtSymbol = updated.includes('@');
            if (!hasAtSymbol || deletedChar === '@') {
              actions.setFileMode(false);
            } else {
              actions.setFileQuery(updated);
            }
          }
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

          // Check what character was deleted
          const deletedChar = currentInput[index - 1];

          // Update command mode based on updated content
          const startsWithSlash = updated.startsWith('/');
          if (isCommandMode) {
            if (!startsWithSlash || deletedChar === '/') {
              actions.setCommandMode(false);
            } else {
              actions.setCommandQuery(updated);
            }
          }

          // Update file mode based on updated content
          if (isFileMode) {
            const hasAtSymbol = updated.includes('@');
            if (!hasAtSymbol || deletedChar === '@') {
              actions.setFileMode(false);
            } else {
              actions.setFileQuery(updated);
            }
          }
        }
        return;
      }

      if (key.ctrl && key.c) {
        process.exit(0);
        return;
      }

      // Handle ESC key - exit command mode, file mode, or stop streams
      if (key.escape) {
        if (isCommandMode) {
          actions.setCommandMode(false);
          return;
        }
        if (isFileMode) {
          actions.setFileMode(false);
          return;
        }

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

        // Detect command mode - if input starts with '/'
        const startsWithSlash = updated.startsWith('/');
        if (startsWithSlash && !isCommandMode) {
          actions.setCommandMode(true);
          actions.setCommandQuery(updated);
        } else if (isCommandMode && startsWithSlash) {
          actions.setCommandQuery(updated);
        } else if (isCommandMode && !startsWithSlash) {
          actions.setCommandMode(false);
        }

        // Detect file mode - only when user actually types '@' character
        if (input === '@') {
          if (!isFileMode) {
            actions.setFileMode(true);
            actions.setFileQuery(updated);
          }
        } else if (isFileMode) {
          // Update query if we're already in file mode
          const containsAt = updated.includes('@');
          if (containsAt) {
            actions.setFileQuery(updated);
          } else {
            actions.setFileMode(false);
          }
        }
      }
    },
    [
      actions,
      currentInput,
      currentMode,
      isCommandMode,
      isFileMode,
      processMessage,
      getActiveStreamIds,
      stopAllStreams,
      navigateCommandList,
      getSelectedCommand,
      navigateFileList,
      getSelectedFile,
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
