import React, { useState, useEffect, memo } from 'react';
import { Box, Text } from 'ink';
import { StreamingMessage } from '../types.js';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { highlight } from 'cli-highlight';

interface StreamingMessageProps {
  message: StreamingMessage;
}

// Configure marked with terminal renderer and proper syntax highlighting
marked.setOptions({
  renderer: new TerminalRenderer({
    // Enable syntax highlighting
    code: (code: string, language?: string) => {
      try {
        if (language) {
          return highlight(code, { language, theme: 'github' });
        }
        return highlight(code, { theme: 'github' });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // Fallback to plain text if highlighting fails
        return code;
      }
    },
    // Fix blockquote rendering
    blockquote: (quote: string) => `▐ ${quote}`,
    // Fix heading rendering
    heading: (text: string, level: number) => {
      const prefix = '█'.repeat(level);
      return `${prefix} ${text}`;
    },
    // // Fix list item rendering
    // listitem: (text: string) => `• ${text}`,
    // // Fix ordered list rendering with proper numbering
    // list: (body: string, ordered: boolean) => {
    //   if (ordered) {
    //     const items = body.split('\n').filter(item => item.trim());
    //     return (
    //       items
    //         .map((item, index) => item.replace(/^• /, `${index + 1}. `))
    //         .join('\n') + '\n'
    //     );
    //   }
    //   return body;
    // },
    // Fix bold and italic rendering
    // strong: (text: string) => `\x1b[1m${text}\x1b[0m`,
    // em: (text: string) => `\x1b[3m${text}\x1b[0m`,
    // Fix paragraph rendering
    // paragraph: (text: string) => `${text}\n`,
  }),
});

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
            {message.partialContent || message.content ? (
              <>
                <Text>
                  {
                    marked(
                      message.partialContent || message.content || ''
                    ) as string
                  }
                </Text>
                {!message.isComplete && <Text color="gray">▊</Text>}
              </>
            ) : (
              <Text>
                <Text color={color}>{label}</Text>
                {!message.isComplete && (
                  <Text color={color}>
                    {dots}
                    {spaces}
                  </Text>
                )}
              </Text>
            )}
          </Box>
        </Box>

        {message.canStop && !message.isComplete && (
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
