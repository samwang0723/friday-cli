// MarkdownInk.tsx
import React, { Fragment, useMemo } from 'react';
import { Box, Text, Newline } from 'ink';
import InkLink from 'ink-link';
import { marked, Tokens } from 'marked';
import { highlight } from 'cli-highlight';

type Tok = Tokens.Generic;

function highlightCode(code: string, language?: string) {
  try {
    return highlight(code, { language, ignoreIllegals: true, theme: 'github' });
  } catch {
    return code;
  }
}

function renderInline(tokens: Tok[] = []): React.ReactNode {
  return tokens.map((t, i) => {
    switch (t.type) {
      case 'strong':
        return (
          <Text key={i} bold>
            {renderInline((t as Tokens.Strong).tokens!)}
          </Text>
        );
      case 'em':
        return (
          <Text key={i} italic>
            {renderInline((t as Tokens.Em).tokens!)}
          </Text>
        );
      case 'codespan':
        return (
          <Text key={i} inverse>
            {(t as Tokens.Codespan).text}
          </Text>
        );
      case 'link': {
        const link = t as Tokens.Link;
        return (
          <InkLink key={i} url={link.href}>
            {renderInline(link.tokens!)}
          </InkLink>
        );
      }
      case 'text': {
        const tt = t as Tokens.Text;
        // ⬇️ important: descend if nested tokens exist (e.g., strong inside text)
        return tt.tokens ? (
          <Fragment key={i}>
            {renderInline(tt.tokens as unknown as Tok[])}
          </Fragment>
        ) : (
          <Fragment key={i}>{tt.text}</Fragment>
        );
      }
      default:
        return t?.tokens ? (
          <Fragment key={i}>{renderInline(t.tokens)}</Fragment>
        ) : null;
    }
  });
}

// Produce an array of *block-level* React nodes; each block should render on its own line(s)
function renderBlocks(tokens: Tok[] = []): React.ReactNode[] {
  const out: React.ReactNode[] = [];

  tokens.forEach((t, i) => {
    switch (t.type) {
      case 'paragraph': {
        const node = (
          <Text key={`p-${i}`} wrap="wrap">
            {renderInline((t as Tokens.Paragraph).tokens!)}
          </Text>
        );
        out.push(node);
        break;
      }

      case 'heading': {
        const h = t as Tokens.Heading;
        const node = (
          <Text key={`h-${i}`} bold wrap="wrap">
            {renderInline(h.tokens!)}
          </Text>
        );
        out.push(node);
        break;
      }

      case 'blockquote': {
        const b = t as Tokens.Blockquote;
        // Blockquote tokens are usually paragraphs; render each on its own line with prefix
        const inner = (b.tokens as Tok[] | undefined) ?? [];
        inner.forEach((child, j) => {
          if ((child as Tokens.Paragraph).type === 'paragraph') {
            out.push(
              <Text key={`bq-${i}-${j}`} wrap="wrap">
                ▐ {renderInline((child as Tokens.Paragraph).tokens!)}
              </Text>
            );
          }
        });
        break;
      }

      case 'list': {
        const l = t as Tokens.List;
        l.items.forEach((item, j) => {
          out.push(
            <Text key={`li-${i}-${j}`} wrap="wrap">
              {l.ordered ? `${Number(l.start ?? 1) + j}. ` : '• '}
              {renderInline(item.tokens!)}
            </Text>
          );
        });
        break;
      }

      case 'code': {
        const c = t as Tokens.Code;
        const ansi = highlightCode(c.text, c.lang);
        // isolate code in its own block lines
        out.push(
          <Box borderStyle="round" borderColor="yellow" paddingX={1}>
            <Text key={`code-${i}`} wrap="wrap">
              {ansi}
            </Text>
          </Box>
        );
        break;
      }

      case 'hr': {
        out.push(<Text key={`hr-${i}`}>────────────────────────────────</Text>);
        break;
      }

      case 'space': {
        // Represent blank line between blocks
        out.push(
          <Text key={`sp-${i}`}>
            <Newline />
          </Text>
        );
        break;
      }

      default:
        // ignore others for now
        break;
    }
  });

  return out;
}

export function MarkdownInk({ text }: { text: string }) {
  const sanitized = useMemo(() => text.replace(/\n+$/, ''), [text]);
  marked.setOptions({ gfm: true, breaks: false });

  const tokens = useMemo(
    () => marked.lexer(sanitized) as unknown as Tok[],
    [sanitized]
  );

  const blocks = renderBlocks(tokens);

  // CRUCIAL: stack blocks vertically so they don't collide horizontally
  return (
    <Box flexDirection="column" width="100%">
      {blocks.map((b, i) => (
        <Box key={`blk-${i}`} flexDirection="row" width="100%">
          {b}
        </Box>
      ))}
    </Box>
  );
}
