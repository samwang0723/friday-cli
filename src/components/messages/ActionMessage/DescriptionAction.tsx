import React from 'react';
import { Text } from 'ink';
import { ActionMessage } from '../../../types.js';
import { BaseMessage, MessageIndicator } from '../BaseMessage.js';

interface DescriptionActionProps {
  message: ActionMessage;
}

export function DescriptionAction({ message }: DescriptionActionProps) {
  return (
    <BaseMessage 
      indicator={<MessageIndicator color="blue" />}
    >
      <Text>{message.content}</Text>
    </BaseMessage>
  );
}