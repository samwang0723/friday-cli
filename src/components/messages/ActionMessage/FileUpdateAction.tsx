import React from 'react';
import { Box, Text } from 'ink';
import { ActionMessage } from '../../../types.js';
import { MessageIndicator } from '../BaseMessage.js';

interface FileUpdateActionProps {
  message: ActionMessage;
}

export function FileUpdateAction({ message }: FileUpdateActionProps) {
  const { filePath, additions = 0, removals = 0, writeResult, autoApplied } = message.metadata || {};
  const { diffLines = [] } = message.metadata || {};

  const changesSummary: string[] = [];
  if (additions > 0) changesSummary.push(`${additions} additions`);
  if (removals > 0) changesSummary.push(`${removals} removals`);

  const changesText =
    changesSummary.length > 0 ? ` with ${changesSummary.join(' and ')}` : '';

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <MessageIndicator color="white" />
        <Text>{message.content}</Text>
      </Box>
      {filePath && (
        <Box>
          <Text color="gray">{`   ⎿ `}</Text>
          <Text> Update </Text>
          <Text color="cyan">{filePath}</Text>
          <Text color="white">{changesText}</Text>
          {autoApplied && writeResult && (
            <Text color={writeResult.success ? "green" : "red"}>
              {writeResult.success ? " ✓ Applied" : ` ✗ Failed: ${writeResult.error}`}
            </Text>
          )}
          {writeResult?.backup && (
            <Text color="gray"> (backup created)</Text>
          )}
        </Box>
      )}
      {diffLines.length > 0 && (
        <Box flexDirection="column" marginLeft={2}>
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
      )}
    </Box>
  );
}
