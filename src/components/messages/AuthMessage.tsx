import React from 'react';
import { Box, Text } from 'ink';
import { AuthMessage as AuthMessageType } from '../../types.js';
import { MessageIndicator } from './BaseMessage.js';

interface AuthMessageProps {
  message: AuthMessageType;
}

function getAuthColor(
  type: AuthMessageType['authType']
): 'green' | 'red' | 'yellow' | 'cyan' {
  switch (type) {
    case 'success':
      return 'green';
    case 'error':
      return 'red';
    case 'loading':
      return 'yellow';
    case 'status':
    default:
      return 'cyan';
  }
}

export function AuthMessage({ message }: AuthMessageProps) {
  const color = getAuthColor(message.authType);

  // Derive display values
  const provider = message.metadata?.provider;
  const user = message.metadata?.user;

  const title =
    message.authType === 'status' ? 'Account • /login' : message.content;

  // Detail lines for status view
  const detailLines: string[] = [];
  if (message.authType === 'status') {
    if (provider) {
      const loginMethod =
        provider.toLowerCase() === 'google' ? 'Google OAuth' : provider;
      detailLines.push(`Login Method: ${loginMethod}`);
    }
    if (user?.name) {
      detailLines.push(`Organization: ${user.name}`);
    }
    if (user?.email) {
      detailLines.push(`Email: ${user.email}`);
    }
    if (!provider && !user) {
      // Not authenticated
      detailLines.push('Login Method: Not logged in');
      detailLines.push('Hint: Use /login to authenticate');
    }
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <MessageIndicator color={color} />
        <Text color={color}>{title}</Text>
      </Box>

      {message.authType === 'status' &&
        detailLines.map((line, idx) => (
          <Box key={idx} marginLeft={2}>
            <Text color="gray">L </Text>
            <Text>{line}</Text>
          </Box>
        ))}
    </Box>
  );
}

export default AuthMessage;
