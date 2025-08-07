import React, { useEffect, useRef, memo, useState } from 'react';
import { Box, useStdout } from 'ink';
import { AppProvider, useApp } from '../context/AppContext.js';
import { ChatHistory } from './ChatHistory.js';
import { InputBox } from './InputBox.js';
import { StatusBar } from './StatusBar.js';
import { MESSAGE_TYPE } from '../utils/constants.js';
import VoiceRecorder from './VoiceRecorder.js';

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

// Hook for screen size
function useScreenSize() {
  const { stdout } = useStdout();
  const getSize = () => ({ height: stdout.rows, width: stdout.columns });
  const [size, setSize] = useState(getSize);

  useEffect(() => {
    const onResize = () => setSize(getSize());
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  return size;
}

// Main UI component that doesn't need context
const FridayApp = memo(function FridayApp() {
  const { width } = useScreenSize(); // Get terminal width only

  return (
    <Box flexDirection="column" width={width} padding={2}>
      <AppInitializer />
      <ChatHistory />
      <VoiceRecorder />
      <InputBox />
      <StatusBar />
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
