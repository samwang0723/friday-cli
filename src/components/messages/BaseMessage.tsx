import React from 'react';
import { Box, Text } from 'ink';

interface BaseMessageProps {
  children: React.ReactNode;
  marginTop?: number;
  indicator?: React.ReactNode;
}

export function BaseMessage({ 
  children, 
  marginTop = 1, 
  indicator 
}: BaseMessageProps) {
  return (
    <Box marginTop={marginTop}>
      {indicator}
      {children}
    </Box>
  );
}

export function MessageIndicator({ 
  color, 
  symbol = '⏺' 
}: { 
  color: string; 
  symbol?: string; 
}) {
  return <Text color={color}>{symbol}</Text>;
}