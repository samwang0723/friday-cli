import React, { useMemo, memo } from 'react';
import { Box, Text } from 'ink';
import figlet from 'figlet';

export const Header = memo(function Header() {
  const bannerText = useMemo(() => {
    return figlet.textSync('Friday', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 130,
      whitespaceBreak: true,
    });
  }, []);

  return (
    <Box flexDirection="column">
      <Text color="cyan">{bannerText}</Text>
      <Text color="gray">───────── Best terminal AI assistant ─────────</Text>
    </Box>
  );
});
