import React, { useState, useEffect, memo } from 'react';
import { Box, Text } from 'ink';
import { StreamingMessage } from '../types.js';

interface StreamingMessageProps {
  message: StreamingMessage;
}

export const StreamingMessageComponent = memo(
  function StreamingMessageComponent({ message }: StreamingMessageProps) {
    const [dotCount, setDotCount] = useState(0);

    // Animate typing indicator dots when streaming
    useEffect(() => {
      if (!message.isComplete) {
        const interval = setInterval(() => {
          setDotCount(prev => (prev + 1) % 4);
        }, 500);
        return () => clearInterval(interval);
      }
    }, [message.isComplete]);

    const getIndicatorAndColor = () => {
      switch (message.streamingType) {
        case 'thinking':
          return {
            indicator: '⏺',
            color: 'yellow' as const,
            label: 'Thinking',
          };
        case 'response':
          return {
            indicator: '⏺',
            color: 'white' as const,
            label: 'Response',
          };
        case 'connection':
          return {
            indicator: '⏺',
            color: 'cyan' as const,
            label: 'Connection',
          };
        default:
          return {
            indicator: '⏺',
            color: 'gray' as const,
            label: 'Stream',
          };
      }
    };

    const { indicator, color, label } = getIndicatorAndColor();
    const dots = '.'.repeat(dotCount);
    const spaces = ' '.repeat(3 - dotCount);

    return (
      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text color={color}>{indicator}</Text>
          <Box flexGrow={1}>
            <Text>
              {message.partialContent || message.content || (
                <>
                  <Text color={color}>{label}</Text>
                  {!message.isComplete && (
                    <Text color={color}>
                      {dots}
                      {spaces}
                    </Text>
                  )}
                </>
              )}
              {!message.isComplete &&
                (message.partialContent || message.content) && (
                  <Text color="gray">▊</Text>
                )}
            </Text>
          </Box>
        </Box>

        {message.canStop && !message.isComplete && (
          <Box marginLeft={2}>
            <Text color="gray" dimColor>
              Type /stop to cancel
            </Text>
          </Box>
        )}
      </Box>
    );
  }
);

export default StreamingMessageComponent;
