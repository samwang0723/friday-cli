import * as diff from 'diff';

export interface ParsedFileModification {
  filepath: string;
  code: string;
  language?: string;
}

export interface ParsedDiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
  lineNumber: number;
}

/**
 * Parse file modifications from chat stream responses
 * Looks for pattern: filepath\n```language\n(code)\n```
 */
export function parseFileModifications(
  response: string
): ParsedFileModification[] {
  const modifications: ParsedFileModification[] = [];

  // Regex to match: filepath (with optional "File: " prefix) followed by code block
  const pattern =
    /^(?:File:\s*)?(.+?\.(ts|tsx|js|jsx|html|css|json|md|go|rs|py|rb|sh|bash|json|txt))\s*\n```(\w+)?\n([\s\S]*?)\n```/gm;

  let match;
  while ((match = pattern.exec(response)) !== null) {
    const [, filepath, , language, code] = match;
    modifications.push({
      filepath: filepath.trim(),
      code: code.trim(),
      language: language || getLanguageFromExtension(filepath),
    });
  }

  return modifications;
}

/**
 * Generate diff lines between original and new code
 */
export function generateDiffLines(
  originalCode: string,
  newCode: string
): ParsedDiffLine[] {
  const diffLines: ParsedDiffLine[] = [];
  const patches = diff.structuredPatch(
    'original',
    'modified',
    originalCode,
    newCode
  );

  let lineNumber = 1;

  for (const hunk of patches.hunks) {
    // Update line number to match hunk start
    lineNumber = hunk.oldStart;

    for (const line of hunk.lines) {
      const type = line[0];
      const content = line.slice(1);

      if (type === '+') {
        diffLines.push({
          type: 'added',
          content,
          lineNumber,
        });
        lineNumber++;
      } else if (type === '-') {
        diffLines.push({
          type: 'removed',
          content,
          lineNumber,
        });
      } else {
        diffLines.push({
          type: 'context',
          content,
          lineNumber,
        });
        lineNumber++;
      }
    }
  }

  return diffLines;
}

/**
 * Remove file modification code blocks from content completely, leaving only explanatory text
 */
export function removeFileModificationBlocks(content: string): string {
  // Same regex pattern as parseFileModifications
  const pattern =
    /^(?:File:\s*)?(.+?\.(ts|tsx|js|jsx|html|css|json|md|go|rs|py|rb|sh|bash|json|txt))\s*\n```(\w+)?\n([\s\S]*?)\n```/gm;

  // Remove file modification blocks completely (replace with empty string)
  let cleanedContent = content.replace(pattern, '');

  // Clean up excessive whitespace - replace 3+ consecutive newlines with just 2
  cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n');

  return cleanedContent.trim();
}

/**
 * Filter out file modification blocks from streaming content in real-time
 * Once we detect the start of a file modification (filename + ```), we truncate the content
 */
export function filterStreamingContent(content: string): string {
  // Pattern to detect the start of a file modification: filename (with optional "File: " prefix) followed by ```
  const fileModStartPattern =
    /^(?:File:\s*)?(.+?\.(ts|tsx|js|jsx|html|css|json|md|go|rs|py|rb|sh|bash))\s*\n```/gm;

  // Find if there's a file modification starting
  const match = fileModStartPattern.exec(content);

  if (match) {
    // If we detect the start of a file modification, truncate content at that point
    const truncateIndex = match.index;
    return content.substring(0, truncateIndex).trim();
  }

  // If no file modification detected, return content as-is
  return content;
}

/**
 * Get language identifier from file extension
 */
function getLanguageFromExtension(filepath: string): string {
  const ext = filepath.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'text';
  }
}
