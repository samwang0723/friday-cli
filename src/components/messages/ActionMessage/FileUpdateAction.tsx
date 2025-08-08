import React from 'react';
import { Box, Text } from 'ink';
import { ActionMessage } from '../../../types.js';
import { MessageIndicator } from '../BaseMessage.js';

interface FileUpdateActionProps {
  message: ActionMessage;
}

export function FileUpdateAction({ message }: FileUpdateActionProps) {
  const { filePath, additions = 0, removals = 0 } = message.metadata || {};

  const changesSummary: string[] = [];
  if (additions > 0) changesSummary.push(`${additions} additions`);
  if (removals > 0) changesSummary.push(`${removals} removals`);

  const changesText =
    changesSummary.length > 0 ? ` with ${changesSummary.join(' and ')}` : '';

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <MessageIndicator color="blue" />
        <Text>{message.content}</Text>
      </Box>
      {filePath && (
        <Box>
          <Text color="gray">⎿ </Text>
          <Text> Updated </Text>
          <Text color="cyan">{filePath}</Text>
          <Text color="gray">{changesText}</Text>
        </Box>
      )}
    </Box>
  );
}
