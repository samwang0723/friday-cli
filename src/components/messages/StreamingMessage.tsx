import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';
import { StreamingMessage } from '../../types.js';
import { MarkdownInk } from './MarkdownInk.js';

interface StreamingMessageProps {
  message: StreamingMessage;
}

export const StreamingMessageComponent = memo(
  function StreamingMessageComponent({ message }: StreamingMessageProps) {

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

    return (
      <Box flexDirection="column" marginTop={1}>
        <Box>
          {!message.isComplete ? (
            <Spinner />
          ) : (
            <Text color={color}>{indicator}</Text>
          )}
          <Text> </Text>
          <Box flexGrow={1} flexDirection="column">
            {message.partialContent || message.content ? (
              <MarkdownInk
                text={message.partialContent || message.content || ''}
              />
            ) : (
              <Text>
                <Text color={color}>{label}</Text>
                {!message.isComplete && <Text color="gray">...</Text>}
              </Text>
            )}
          </Box>
        </Box>

        {message.canStop &&
          !message.isComplete &&
          !(message.partialContent || message.content) && (
            <Box marginLeft={2}>
              <Text color="gray" dimColor>
                Type ESC to cancel
              </Text>
            </Box>
          )}
      </Box>
    );
  }
);

export default StreamingMessageComponent;
