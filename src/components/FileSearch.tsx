import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { useApp } from '../context/AppContext.js';
import { useFileNavigation } from '../hooks/useFileNavigation.js';

export const FileSearch = memo(function FileSearch() {
  const { state } = useApp();
  const { fileQuery } = state;
  const { availableFiles, selectedFileIndex, isLoading } = useFileNavigation();

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="green"
      paddingX={1}
    >
      {/* Header with animated search indicator */}
      <Box paddingY={0} marginBottom={1}>
        <Text color="green" bold>
          📁 Files
        </Text>
        <Text color="gray" dimColor>
          {' '}
          ({availableFiles.length} found)
        </Text>
        {(() => {
          const atIndex = fileQuery.lastIndexOf('@');
          if (atIndex === -1) return null;
          
          let queryEndIndex = atIndex + 1;
          while (queryEndIndex < fileQuery.length && fileQuery[queryEndIndex] !== ' ') {
            queryEndIndex++;
          }
          
          const searchTerm = fileQuery.slice(atIndex + 1, queryEndIndex).trim();
          
          return searchTerm.length > 0 ? (
            <Text color="yellow" dimColor>
              {' '}
              · searching "{searchTerm}"
            </Text>
          ) : null;
        })()}
        {isLoading && (
          <Text color="blue" dimColor>
            {' '}
            · loading...
          </Text>
        )}
      </Box>

      {/* File List */}
      {availableFiles.length > 0 ? (
        <Box flexDirection="column" height={6} overflowY="hidden">
          {(() => {
            // Calculate the visible window
            const maxVisible = 5;
            const startIndex = Math.max(0, selectedFileIndex - Math.floor(maxVisible / 2));
            const endIndex = Math.min(availableFiles.length, startIndex + maxVisible);
            const adjustedStartIndex = Math.max(0, endIndex - maxVisible);
            
            return availableFiles.slice(adjustedStartIndex, endIndex).map((file, displayIndex) => {
              const actualIndex = adjustedStartIndex + displayIndex;
              const isSelected = actualIndex === selectedFileIndex;

              return (
                <Box key={file.path} paddingX={1}>
                  {isSelected && <Text color="green">▶ </Text>}
                  <Text
                    color={isSelected ? 'black' : 'green'}
                    backgroundColor={isSelected ? 'green' : undefined}
                    bold={isSelected}
                  >
                    {file.relativePath}{file.isDirectory ? '/' : ''}
                  </Text>
                </Box>
              );
            });
          })()}
        </Box>
      ) : (
        <Box paddingX={1}>
          <Text color="yellow">
            {isLoading 
              ? 'Searching files...' 
              : (() => {
                  const atIndex = fileQuery.lastIndexOf('@');
                  if (atIndex === -1) return 'No files found';
                  
                  let queryEndIndex = atIndex + 1;
                  while (queryEndIndex < fileQuery.length && fileQuery[queryEndIndex] !== ' ') {
                    queryEndIndex++;
                  }
                  
                  const searchTerm = fileQuery.slice(atIndex + 1, queryEndIndex).trim();
                  return searchTerm.length > 0 ? `No files match "${searchTerm}"` : 'No files found';
                })()
            }
          </Text>
        </Box>
      )}

      {/* Footer with navigation hints */}
      <Box marginTop={1} paddingX={1}>
        <Text color="gray" dimColor>
          ↑↓ navigate • Enter select • Esc cancel
        </Text>
        {availableFiles.length > 0 && selectedFileIndex >= 0 && (
          <Text color="yellow" dimColor>
            {' • '}
            {availableFiles[selectedFileIndex]?.relativePath}{availableFiles[selectedFileIndex]?.isDirectory ? '/' : ''} ready
          </Text>
        )}
      </Box>
    </Box>
  );
});