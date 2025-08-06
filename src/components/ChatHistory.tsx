import React, { useMemo, memo } from 'react';
import { Box } from 'ink';
import { useApp } from '../context/AppContext.js';
import { MessageItem } from './MessageItem.js';

export const ChatHistory = memo(function ChatHistory() {
  const { state } = useApp();
  const { chatHistory } = state;

  const visibleMessages = useMemo(() => {
    return chatHistory;
  }, [chatHistory]);

  const messageElements = useMemo(
    () =>
      visibleMessages.map(message => (
        <MessageItem key={message.id} message={message} />
      )),
    [visibleMessages]
  );

  return (
    <Box flexDirection="column" marginY={1}>
      {messageElements}
    </Box>
  );
});
