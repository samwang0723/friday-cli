import React from 'react';
import { Box, Text } from 'ink';
import { ActionMessage } from '../../../types.js';

interface NestedActionProps {
  message: ActionMessage;
}

export function NestedAction({ message }: NestedActionProps) {
  const textColor = message.color || undefined;
  return (
    <Box>
      <Text color="gray">⎿ </Text>
      <Text color={textColor}>{` ${message.content}`}</Text>
    </Box>
  );
}