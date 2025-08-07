import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { useApp } from '../context/AppContext.js';
import { modeConfigs } from '../types.js';

export const StatusBar = memo(function StatusBar() {
  const { state } = useApp();
  const { currentMode, auth } = state;
  const { icon, color } = modeConfigs[currentMode];

  // Auth status display
  const getAuthDisplay = () => {
    if (auth.isLoading) {
      return <Text color="yellow">🔄 Authenticating...</Text>;
    }

    if (auth.isAuthenticated && auth.user) {
      const displayName = auth.user.name || auth.user.email;
      return <Text color="green">🔓 {displayName}</Text>;
    }

    return <Text color="gray">🔒 Not authenticated</Text>;
  };

  return (
    <Box paddingX={1} justifyContent="space-between">
      <Box>
        <Text color={color}>
          {icon} {currentMode} mode
        </Text>
        <Text color="gray">
          {' '}
          {currentMode === 'voice'
            ? '(Press SPACE to record · Press SPACE again to stop & play)'
            : '(Shift+Tab: switch · Enter: send · Ctrl+C: exit)'}
        </Text>
      </Box>
      <Box>{getAuthDisplay()}</Box>
    </Box>
  );
});
