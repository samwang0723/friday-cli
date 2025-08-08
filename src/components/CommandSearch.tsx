import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { useApp } from '../context/AppContext.js';
import { useCommandNavigation } from '../hooks/useCommandNavigation.js';

export const CommandSearch = memo(function CommandSearch() {
  const { state } = useApp();
  const { commandQuery } = state;
  const { filteredCommands, selectedCommandIndex } = useCommandNavigation();

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
    >
      {/* Header with animated search indicator */}
      <Box paddingY={0} marginBottom={1}>
        <Text color="cyan" bold>
          ⚡ Commands
        </Text>
        <Text color="gray" dimColor>
          {' '}
          ({filteredCommands.length} found)
        </Text>
        {commandQuery.length > 1 && (
          <Text color="yellow" dimColor>
            {' '}
            · searching "{commandQuery.replace('/', '')}"
          </Text>
        )}
      </Box>

      {/* Command List */}
      {filteredCommands.length > 0 ? (
        <Box flexDirection="column" height={6} overflowY="hidden">
          {filteredCommands.slice(0, 5).map((command, index) => {
            const isSelected = index === selectedCommandIndex;

            return (
              <Box key={command.name} paddingX={1}>
                {isSelected && <Text color="cyan">▶ </Text>}
                <Box width={12}>
                  <Text
                    color={isSelected ? 'black' : 'cyan'}
                    backgroundColor={isSelected ? 'cyan' : undefined}
                    bold={isSelected}
                  >
                    {command.usage}
                  </Text>
                </Box>
                <Text
                  color={isSelected ? 'white' : 'gray'}
                  dimColor={!isSelected}
                >
                  {isSelected ? '→ ' : '  '}
                  {command.description}
                </Text>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box paddingX={1}>
          <Text color="yellow">No commands match "{commandQuery}"</Text>
        </Box>
      )}

      {/* Footer with navigation hints */}
      <Box marginTop={1} paddingX={1}>
        <Text color="gray" dimColor>
          ↑↓ navigate • Enter select • Esc cancel
        </Text>
        {filteredCommands.length > 0 && selectedCommandIndex >= 0 && (
          <Text color="yellow" dimColor>
            {' • '}
            {filteredCommands[selectedCommandIndex]?.usage} ready
          </Text>
        )}
      </Box>
    </Box>
  );
});
