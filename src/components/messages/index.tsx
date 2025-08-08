import React, { memo } from 'react';
import {
  ChatMessage,
  ActionMessage,
  StreamingMessage,
  AuthMessage,
} from '../../types.js';
import { MESSAGE_TYPE } from '../../utils/constants.js';
import { UserMessage } from './UserMessage.js';
import { SystemMessage } from './SystemMessage.js';
import { ActionMessageComponent } from './ActionMessage/index.js';
import { StreamingMessageComponent } from './StreamingMessage.js';
import { AuthMessage as AuthMessageComponent } from './AuthMessage.js';

interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem = memo(function MessageItem({
  message,
}: MessageItemProps) {
  switch (message.type) {
    case MESSAGE_TYPE.USER:
      return <UserMessage message={message} />;
    case MESSAGE_TYPE.SYSTEM:
      return <SystemMessage message={message} />;
    case MESSAGE_TYPE.ACTION:
      return <ActionMessageComponent message={message as ActionMessage} />;
    case MESSAGE_TYPE.STREAMING:
      return (
        <StreamingMessageComponent message={message as StreamingMessage} />
      );
    case MESSAGE_TYPE.AUTH:
      return <AuthMessageComponent message={message as AuthMessage} />;
    default:
      return null;
  }
});

export * from './BaseMessage.js';
export * from './UserMessage.js';
export * from './SystemMessage.js';
export * from './ActionMessage/index.js';
export * from './StreamingMessage.js';
