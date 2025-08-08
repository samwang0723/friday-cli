// src/components/VoiceRecorder.tsx

import React, { memo, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder.js';

const VoiceRecorder: React.FC = memo(() => {
  const { isRecording, status, isPlaying, isError, handleSpacePress } =
    useVoiceRecorder();

  const handleInput = useCallback(
    (input: string) => {
      // Handle SPACE key press
      if (input === ' ') {
        handleSpacePress();
        return;
      }
    },
    [handleSpacePress]
  );

  useInput(handleInput);

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      borderStyle="round"
      borderColor="green"
    >
      <Text bold color="green">
        Voice Recorder (SoX, Bun/Node CLI)
      </Text>
      <Text>Status: {status}</Text>
      <Text color="gray" dimColor>
        Press SPACE to {isRecording ? 'stop & play' : 'start recording'}
      </Text>
      {isRecording && <Text color="red">● REC</Text>}
      {isPlaying && <Text color="green">● PLAY</Text>}
      {isError && <Text color="red">● ERROR</Text>}
    </Box>
  );
});

VoiceRecorder.displayName = 'VoiceRecorder';

export default VoiceRecorder;
