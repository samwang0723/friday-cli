import React, { memo, useMemo } from 'react';
import { Box, Text } from 'ink';
import { useApp } from '../context/AppContext.js';
import { modeConfigs } from '../types.js';
import type { ConnectionStatus } from '../types.js';

// Status configuration moved outside component to avoid recreation on every render
const STATUS_CONFIG = {
  connecting: { icon: '⏺', color: 'yellow' as const, text: 'Connecting...' },
  connected: { icon: '☀', color: 'green' as const, text: 'Connected' },
  streaming: { icon: '⚡', color: 'blue' as const, text: 'Streaming' },
  stopped: { icon: '⏸', color: 'gray' as const, text: 'Stopped' },
  error: { icon: '✘', color: 'red' as const, text: 'Connection Error' },
  disconnected: { icon: '⏸', color: 'gray' as const, text: 'Disconnected' },
} as const satisfies Record<
  ConnectionStatus,
  { icon: string; color: string; text: string }
>;

export const StatusBar = memo(function StatusBar() {
  const { state } = useApp();
  const { currentMode, auth, streaming } = state;
  const { icon, color } = modeConfigs[currentMode];

  // Memoize auth display to prevent unnecessary re-renders
  const authDisplay = useMemo(() => {
    if (auth.isLoading) {
      return <Text color="yellow">⚡Authenticating...</Text>;
    }

    if (auth.isAuthenticated && auth.user) {
      const displayName = auth.user.name || auth.user.email;
      return <Text color="white">⏺ {displayName}</Text>;
    }

    return <Text color="gray">🔒Not authenticated</Text>;
  }, [auth.isLoading, auth.isAuthenticated, auth.user]);

  // Memoize connection display to prevent unnecessary re-renders
  const connectionDisplay = useMemo(() => {
    const { connectionStatus, canStop, activeStreams } = streaming;

    const config =
      STATUS_CONFIG[connectionStatus] || STATUS_CONFIG.disconnected;
    const streamCount = activeStreams.size;

    return (
      <Box>
        <Text color={config.color}>
          {config.icon} {config.text}
        </Text>
        {streamCount > 0 && <Text color="gray"> ({streamCount} active)</Text>}
        {canStop && connectionStatus === 'streaming' && (
          <Text color="gray" dimColor>
            {' '}
            · ESC to cancel
          </Text>
        )}
      </Box>
    );
  }, [
    streaming.connectionStatus,
    streaming.canStop,
    streaming.activeStreams.size,
  ]);

  // Memoize guidance text to prevent unnecessary re-renders
  const guidanceText = useMemo(() => {
    return currentMode === 'voice'
      ? '(Press SPACE to record · Press SPACE again to stop & play)'
      : '(shift+tab: switch · ctrl+c: exit)';
  }, [currentMode]);

  return (
    <Box paddingX={1} justifyContent="space-between">
      <Box>
        <Text color={color}>
          {icon} {currentMode} mode
        </Text>
        <Text color="gray"> {guidanceText}</Text>
      </Box>
      <Box gap={2}>
        {connectionDisplay}
        {authDisplay}
      </Box>
    </Box>
  );
});
