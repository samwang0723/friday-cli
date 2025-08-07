import React from 'react';
import { Text } from 'ink';
import { ChatMessage } from '../../types.js';
import { BaseMessage } from './BaseMessage.js';

interface UserMessageProps {
  message: ChatMessage;
}

export function UserMessage({ message }: UserMessageProps) {
  return (
    <BaseMessage 
      indicator={<Text color="gray">{`> `}</Text>}
    >
      <Text color="gray">{message.content}</Text>
    </BaseMessage>
  );
}