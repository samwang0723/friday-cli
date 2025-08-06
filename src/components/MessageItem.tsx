import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { ChatMessage, ActionMessage } from '../types.js';

interface MessageItemProps {
  message: ChatMessage;
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <Box marginTop={1}>
      <Text color="gray">{`> `}</Text>
      <Text color="gray">{message.content}</Text>
    </Box>
  );
}

function SystemMessage({ message }: { message: ChatMessage }) {
  return (
    <Box marginTop={1}>
      <Text color="magentaBright">⏺ </Text>
      <Text color="magentaBright">{message.content}</Text>
    </Box>
  );
}

function DynamicMessage({ message }: { message: ActionMessage }) {
  const indicator = <Text color="blue">⏺ </Text>;

  switch (message.actionType) {
    case 'description':
      return (
        <Box marginTop={1}>
          {indicator}
          <Text>{message.content}</Text>
        </Box>
      );

    case 'file_update':
      return <FileUpdateMessage message={message} />;

    case 'code_diff':
      return <CodeDiffMessage message={message} />;

    case 'nested':
      return (
        <Box>
          <Text color="gray">⎿ </Text>
          <Text>{` ${message.content}`}</Text>
        </Box>
      );

    default:
      return (
        <Box marginTop={1}>
          {indicator}
          <Text>{message.content}</Text>
        </Box>
      );
  }
}

function FileUpdateMessage({ message }: { message: ActionMessage }) {
  const indicator = <Text color="blue">⏺ </Text>;
  const tree = <Text color="gray">⎿ </Text>;
  const { filePath, additions = 0, removals = 0 } = message.metadata || {};

  const changesSummary: string[] = [];
  if (additions > 0) changesSummary.push(`${additions} additions`);
  if (removals > 0) changesSummary.push(`${removals} removals`);

  const changesText =
    changesSummary.length > 0 ? ` with ${changesSummary.join(' and ')}` : '';

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        {indicator}
        <Text>{message.content}</Text>
      </Box>
      {filePath && (
        <Box>
          {tree}
          <Text> Updated </Text>
          <Text color="cyan">{filePath}</Text>
          <Text color="gray">{changesText}</Text>
        </Box>
      )}
    </Box>
  );
}

function CodeDiffMessage({ message }: { message: ActionMessage }) {
  const { diffLines = [] } = message.metadata || {};

  return (
    <Box flexDirection="column" marginTop={1}>
      {diffLines.map((line, index) => {
        const lineNum = line.lineNumber.toString().padStart(3);
        const prefix =
          line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';

        let color: 'green' | 'red' | 'gray' = 'gray';
        if (line.type === 'added') color = 'green';
        else if (line.type === 'removed') color = 'red';

        return (
          <Box key={index}>
            <Text> </Text>
            <Text color="gray">{lineNum} </Text>
            <Text color={color}>
              {prefix} {line.content}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

export const MessageItem = memo(function MessageItem({
  message,
}: MessageItemProps) {
  switch (message.type) {
    case 'user':
      return <UserMessage message={message} />;
    case 'system':
      return <SystemMessage message={message} />;
    case 'action':
      return <DynamicMessage message={message as ActionMessage} />;
    default:
      return null;
  }
});
