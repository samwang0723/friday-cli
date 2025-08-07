import React from 'react';
import { Box, Text } from 'ink';
import { ActionMessage } from '../../../types.js';

interface CodeDiffActionProps {
  message: ActionMessage;
}

export function CodeDiffAction({ message }: CodeDiffActionProps) {
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