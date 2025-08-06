import React, { useCallback, useMemo, memo } from "react";
import { Box, Text, useInput } from "ink";
import { useApp } from "../context/AppContext.js";
import { ChatMessage, AuthMessage } from "../types.js";
import { googleLogin, logout, getAuthStatus } from "../services/oauth.js";

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const InputBox = memo(function InputBox() {
  const { state, actions } = useApp();
  const { currentInput, currentMode } = state;

  // Keyboard handler that uses state directly instead of refs
  const handleKeyInput = useCallback(
    (input: string, key: any) => {
      // Handle regular Enter for submit
      if (key.return) {
        if (!currentInput.trim()) return;

        // Inline submit logic to avoid circular dependency
        const userMessage: ChatMessage = {
          id: generateId(),
          type: "user",
          content: currentInput,
          timestamp: new Date()
        };
        actions.addMessage(userMessage);
        actions.addToCommandHistory(currentInput);
        processMessage(currentInput, actions, currentMode);
        actions.setCurrentInput("");
        return;
      }

      if (key.shift && key.tab) {
        actions.switchMode();
        return;
      }

      if (key.upArrow) {
        actions.navigateHistory("up");
        return;
      }

      if (key.downArrow) {
        actions.navigateHistory("down");
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

      // Handle printable characters (check if it's a valid single character)
      if (input && input.length === 1 && !key.ctrl && !key.meta && !key.alt) {
        actions.setCurrentInput(currentInput + input);
      }
    },
    [actions, currentInput, currentMode]
  ); // Depend on current state for immediate access

  // Handle keyboard input
  useInput(handleKeyInput, {
    isActive: true
  });

  // Memoize input display for performance
  const inputDisplay = useMemo(() => {
    const inputLines = currentInput.split("\n");
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
      <Text color="blue">{">"}</Text>
      {inputDisplay}
    </Box>
  );
});

// Message processing logic (extracted from original implementation)
async function processMessage(
  message: string,
  actions: any,
  currentMode: string
) {
  if (message.startsWith("/")) {
    switch (message.trim()) {
      case "/help":
        actions.addMessage({
          id: generateId(),
          type: "system",
          content: "Available commands: /help, /login, /logout, /auth, /exit",
          timestamp: new Date()
        });
        actions.addMessage({
          id: generateId(),
          type: "system",
          content: "Features: Shift+Tab to switch modes, Up/Down for history",
          timestamp: new Date()
        });
        actions.addMessage({
          id: generateId(),
          type: "system",
          content:
            "⚠️  Note: Make sure AgentCore backend is running for authentication",
          timestamp: new Date()
        });
        break;
      case "/exit":
        actions.addMessage({
          id: generateId(),
          type: "system",
          content: "Goodbye from Friday! 👋",
          timestamp: new Date()
        });
        process.exit(0);
      case "/login":
        // Set loading state
        actions.setAuthLoading(true);

        const loadingMessage: AuthMessage = {
          id: generateId(),
          type: "auth",
          authType: "loading",
          content: "🌐 Starting AgentCore OAuth login...",
          timestamp: new Date()
        };
        actions.addMessage(loadingMessage);

        // Integrate OAuth
        try {
          const result = await googleLogin();

          if (result.success) {
            const authStatus = getAuthStatus();
            if (authStatus.authenticated && authStatus.user?.user_info) {
              actions.setAuthSuccess(
                authStatus.user.user_info as any,
                authStatus.user.access_token
              );

              const successMessage: AuthMessage = {
                id: generateId(),
                type: "auth",
                authType: "success",
                content: result.message,
                timestamp: new Date(),
                metadata: {
                  user: {
                    ...authStatus.user.user_info,
                    id: authStatus.user.user_id
                  },
                  provider: "google"
                }
              };
              actions.addMessage(successMessage);
            } else {
              // Success but no user data yet
              const partialSuccessMessage: AuthMessage = {
                id: generateId(),
                type: "auth",
                authType: "success",
                content: result.message,
                timestamp: new Date()
              };
              actions.addMessage(partialSuccessMessage);
            }
          } else {
            actions.setAuthError(result.message);
            const errorMessage: AuthMessage = {
              id: generateId(),
              type: "auth",
              authType: "error",
              content: result.message,
              timestamp: new Date(),
              metadata: { error: result.message }
            };
            actions.addMessage(errorMessage);
          }
        } catch (error) {
          const errorMsg = `Login error: ${error}`;
          actions.setAuthError(errorMsg);
          const errorMessage: AuthMessage = {
            id: generateId(),
            type: "auth",
            authType: "error",
            content: errorMsg,
            timestamp: new Date(),
            metadata: { error: errorMsg }
          };
          actions.addMessage(errorMessage);
        }
        break;

      case "/logout":
        try {
          const result = await logout();
          actions.clearAuth();

          const logoutMessage: AuthMessage = {
            id: generateId(),
            type: "auth",
            authType: "success",
            content: result.message,
            timestamp: new Date()
          };
          actions.addMessage(logoutMessage);
        } catch (error) {
          const errorMsg = `Logout error: ${error}`;
          actions.setAuthError(errorMsg);
          const errorMessage: AuthMessage = {
            id: generateId(),
            type: "auth",
            authType: "error",
            content: errorMsg,
            timestamp: new Date(),
            metadata: { error: errorMsg }
          };
          actions.addMessage(errorMessage);
        }
        break;

      case "/auth":
        const authStatus = getAuthStatus();
        let statusContent: string;
        let statusMetadata: any = undefined;

        if (authStatus.authenticated && authStatus.user?.user_info) {
          const userInfo = authStatus.user.user_info;
          statusContent = `✅ Authenticated as ${userInfo.name || "Unknown"} (${
            userInfo.email || "Unknown"
          })`;
          statusMetadata = {
            user: {
              ...userInfo,
              id: userInfo.email || userInfo.name || "unknown"
            },
            provider: "google"
          };
        } else {
          statusContent = "🔒 Not authenticated. Use /login to authenticate.";
        }

        const statusMessage: AuthMessage = {
          id: generateId(),
          type: "auth",
          authType: "status",
          content: statusContent,
          timestamp: new Date(),
          metadata: statusMetadata
        };
        actions.addMessage(statusMessage);
        break;
      default:
        actions.addMessage({
          id: generateId(),
          type: "system",
          content: `❌ Unknown command: ${message}. Type /help for available commands.`,
          timestamp: new Date()
        });
    }
  } else {
    // Handle different modes
    const actionMessage: ChatMessage = {
      id: generateId(),
      type: "action",
      actionType: "description",
      content: `Processing ${currentMode} message...`,
      timestamp: new Date()
    };
    actions.addMessage(actionMessage);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 800));

    switch (currentMode) {
      case "text":
        // Example file update message
        actions.addMessage({
          id: generateId(),
          type: "action",
          actionType: "file_update",
          content: "Update text processing logic",
          timestamp: new Date(),
          metadata: {
            filePath: "src/handlers/text.ts",
            additions: 3,
            removals: 1
          }
        });
        break;

      case "voice":
        // Example nested action
        actions.addMessage({
          id: generateId(),
          type: "action",
          actionType: "nested",
          content: "Analyzing audio patterns",
          timestamp: new Date()
        });
        break;

      case "thinking":
        // Example file update with code diff
        actions.addMessage({
          id: generateId(),
          type: "action",
          actionType: "file_update",
          content: "Enhanced reasoning algorithms",
          timestamp: new Date(),
          metadata: {
            filePath: "src/thinking.ts",
            additions: 5,
            removals: 2
          }
        });

        actions.addMessage({
          id: generateId(),
          type: "action",
          actionType: "code_diff",
          content: "",
          timestamp: new Date(),
          metadata: {
            diffLines: [
              {
                lineNumber: 42,
                type: "unchanged",
                content: "function analyzeMessage(input: string) {"
              },
              {
                lineNumber: 43,
                type: "removed",
                content: "  return basicAnalysis(input);"
              },
              {
                lineNumber: 43,
                type: "added",
                content: "  return deepAnalysis(input, context);"
              },
              {
                lineNumber: 44,
                type: "added",
                content: "  // Enhanced with contextual reasoning"
              },
              { lineNumber: 45, type: "unchanged", content: "}" }
            ]
          }
        });
        break;
    }
  }
}
