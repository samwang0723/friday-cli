import React from 'react';
import { Text } from 'ink';
import { ChatMessage } from '../../types.js';
import { BaseMessage, MessageIndicator } from './BaseMessage.js';

interface SystemMessageProps {
  message: ChatMessage;
}

export function SystemMessage({ message }: SystemMessageProps) {
  const messageColor = message.color || 'magentaBright';
  return (
    <BaseMessage indicator={<MessageIndicator color={messageColor} />}>
      <Text color={messageColor}>{message.content}</Text>
    </BaseMessage>
  );
}
