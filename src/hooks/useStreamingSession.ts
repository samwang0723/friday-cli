import { useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext.js';
import { AgentCoreService } from '../services/agentcore.js';
import { OAUTH_CONFIG, MESSAGE_TYPE } from '../utils/constants.js';
import { getAuthStatus } from '../services/oauth.js';
import { StreamingMessage, Mode } from '../types.js';

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function useStreamingSession() {
  const { state, actions } = useApp();
  const activeStreamsRef = useRef<Map<string, AbortController>>(new Map());

  const startStream = useCallback(
    async (message: string, mode: Mode): Promise<string | null> => {
      // Check authentication
      const authStatus = getAuthStatus();
      if (!authStatus.authenticated || !authStatus.user?.access_token) {
        actions.addMessage({
          id: generateId(),
          type: MESSAGE_TYPE.SYSTEM,
          content: 'Please login first using /login to send messages',
          timestamp: new Date(),
        });
        return null;
      }

      // Only handle text and thinking modes
      if (mode !== 'text' && mode !== 'thinking') {
        actions.addMessage({
          id: generateId(),
          type: MESSAGE_TYPE.SYSTEM,
          content: `${mode} mode streaming not yet implemented. Please switch to text or thinking mode.`,
          timestamp: new Date(),
        });
        return null;
      }

      const streamingMessageId = generateId();

      try {
        // Create AgentCore service instance
        const agentCore = new AgentCoreService(
          OAUTH_CONFIG.AGENT_CORE_BASE_URL
        );

        // Create streaming message
        const streamingMessage: StreamingMessage = {
          id: streamingMessageId,
          type: 'streaming',
          streamingType: mode === 'thinking' ? 'thinking' : 'response',
          content: '',
          partialContent: '',
          timestamp: new Date(),
          canStop: true,
          isComplete: false,
        };

        // Add streaming message and start streaming state
        actions.addMessage(streamingMessage);
        actions.startStreaming(
          mode === 'thinking' ? 'thinking' : 'response',
          streamingMessageId
        );
        actions.setConnectionStatus('streaming');

        // Create abort controller for this stream
        const abortController = new AbortController();
        activeStreamsRef.current.set(streamingMessageId, abortController);

        // Context for AgentCore
        const context = {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          clientDatetime: new Date().toISOString(),
          locale: process.env.LANG?.split('.')[0]?.replace('_', '-') || 'en',
        };

        // Stream the response
        let fullContent = '';
        for await (const chunk of agentCore.chatStream(
          message,
          authStatus.user.access_token,
          context,
          abortController.signal
        )) {
          // Check if stream was aborted
          if (abortController.signal.aborted) {
            break;
          }

          if (chunk.type === 'text' && chunk.text) {
            fullContent += chunk.text;
            actions.updateStreamingContent(streamingMessageId, fullContent);
          } else if (chunk.type === 'complete') {
            fullContent = chunk.fullText || fullContent;
            break;
          } else if (chunk.type === 'error') {
            throw new Error(chunk.message || 'Stream error occurred');
          }
        }

        // Clean up abort controller
        activeStreamsRef.current.delete(streamingMessageId);

        // Mark streaming as complete
        if (!abortController.signal.aborted) {
          await actions.completeStreaming(streamingMessageId, fullContent);
          actions.setConnectionStatus('connected');
          return streamingMessageId;
        } else {
          // Handle abortion
          actions.stopStreaming(streamingMessageId);
          actions.setConnectionStatus('connected');
          return null;
        }
      } catch (error) {
        console.error('Streaming session error:', error);

        // Clean up
        activeStreamsRef.current.delete(streamingMessageId);

        // Show error message
        actions.addMessage({
          id: generateId(),
          type: MESSAGE_TYPE.SYSTEM,
          content: `❌ Chat error: ${(error as Error).message}. Please try again.`,
          timestamp: new Date(),
        });

        actions.setConnectionStatus('error');

        // Set back to connected after a short delay
        setTimeout(() => {
          actions.setConnectionStatus('connected');
        }, 3000);

        return null;
      }
    },
    [state.auth.isAuthenticated, state.auth.token, actions]
  );

  const stopStream = useCallback(
    (messageId: string) => {
      const abortController = activeStreamsRef.current.get(messageId);
      if (abortController) {
        console.info(`Stopping stream: ${messageId}`);
        abortController.abort();
        activeStreamsRef.current.delete(messageId);
        actions.stopStreaming(messageId);
        actions.setConnectionStatus('connected');
      }
    },
    [actions]
  );

  const stopAllStreams = useCallback(() => {
    console.info('Stopping all active streams');
    for (const [
      messageId,
      abortController,
    ] of activeStreamsRef.current.entries()) {
      abortController.abort();
      actions.stopStreaming(messageId);
    }
    activeStreamsRef.current.clear();
    actions.setConnectionStatus('connected');
  }, [actions]);

  const getActiveStreamIds = useCallback(() => {
    return Array.from(activeStreamsRef.current.keys());
  }, []);

  const isStreaming = useCallback((messageId?: string) => {
    if (messageId) {
      return activeStreamsRef.current.has(messageId);
    }
    return activeStreamsRef.current.size > 0;
  }, []);

  const getStreamingStats = useCallback(() => {
    return {
      activeStreamCount: activeStreamsRef.current.size,
      activeStreamIds: Array.from(activeStreamsRef.current.keys()),
      connectionStatus: state.streaming.connectionStatus,
      canStop: state.streaming.canStop,
    };
  }, [state.streaming.connectionStatus, state.streaming.canStop]);

  return {
    startStream,
    stopStream,
    stopAllStreams,
    getActiveStreamIds,
    isStreaming,
    getStreamingStats,
    streamingState: state.streaming,
  };
}
