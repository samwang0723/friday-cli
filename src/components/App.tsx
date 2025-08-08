import React, { useEffect, useRef, memo } from 'react';
import { Box } from 'ink';
import { AppProvider, useApp } from '../context/AppContext.js';
import { ChatHistory } from './ChatHistory.js';
import { InputBox } from './InputBox.js';
import { StatusBar } from './StatusBar.js';
import { CommandSearch } from './CommandSearch.js';
import { MESSAGE_TYPE } from '../utils/constants.js';
import VoiceRecorder from './VoiceRecorder.js';
import { useScreenSize } from '../hooks/useScreenSize.js';

// Initialization component that doesn't re-render
function AppInitializer() {
  const { actions } = useApp();
  const initializedRef = useRef(false);

  // Initialize with welcome message - run only once
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      actions.addMessage({
        id: `msg_${Date.now()}_init`,
        type: MESSAGE_TYPE.SYSTEM,
        content: 'Friday AI Assistant initialized. Type your message below.',
        timestamp: new Date(),
      });
    }
  }, []);

  return null; // This component only handles side effects
}


// Main UI component that doesn't need context
const FridayApp = memo(function FridayApp() {
  const { width } = useScreenSize(); // Get terminal width only
  const { state } = useApp();

  return (
    <Box flexDirection="column" width={width} height="100%" padding={2}>
      <AppInitializer />
      <Box flexGrow={1} flexShrink={1}>
        <ChatHistory />
      </Box>
      {state.currentMode === 'voice' && <VoiceRecorder />}
      {state.isCommandMode && <CommandSearch />}
      <InputBox />
      {!state.isCommandMode && <StatusBar />}
    </Box>
  );
});

export default function App() {
  return (
    <AppProvider>
      <FridayApp />
    </AppProvider>
  );
}
