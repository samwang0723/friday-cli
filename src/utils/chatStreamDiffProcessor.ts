import { ActionMessage, DiffLine } from '../types.js';
import {
  parseFileModifications,
  generateDiffLines,
} from './chatStreamParser.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Process chat stream response to create nested diff action messages
 */
export async function processChatStreamForDiffs(
  response: string,
  projectRoot: string = process.cwd()
): Promise<ActionMessage[]> {
  const modifications = parseFileModifications(response);
  const actionMessages: ActionMessage[] = [];

  for (const modification of modifications) {
    const fullPath = path.resolve(projectRoot, modification.filepath);

    try {
      // Read original file if it exists
      let originalCode = '';
      let isNewFile = false;
      if (fs.existsSync(fullPath)) {
        originalCode = fs.readFileSync(fullPath, 'utf-8');
      } else {
        isNewFile = true;
      }

      // Generate diff lines
      const diffLines = generateDiffLines(originalCode, modification.code);

      // Count additions and removals
      const additions = diffLines.filter(line => line.type === 'added').length;
      const removals = diffLines.filter(line => line.type === 'removed').length;

      // Convert our ParsedDiffLine format to the expected DiffLine format
      const formattedDiffLines: DiffLine[] = diffLines.map(line => ({
        lineNumber: line.lineNumber,
        type:
          line.type === 'context'
            ? 'unchanged'
            : line.type === 'added'
              ? 'added'
              : 'removed',
        content: line.content,
      }));

      // Create parent file update action
      const action = isNewFile ? 'Created' : 'Updated';

      const parentAction: ActionMessage = {
        id: `file-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'action',
        actionType: 'file_update',
        timestamp: new Date(),
        content: `${action} (${modification.filepath})`,
        icon: isNewFile ? '📄' : '📝',
        metadata: {
          filePath: modification.filepath,
          additions,
          removals,
          diffLines: formattedDiffLines,
        },
      };

      actionMessages.push(parentAction);
    } catch (error) {
      console.warn(
        `Failed to process diff for ${modification.filepath}:`,
        error
      );
    }
  }

  return actionMessages;
}

/**
 * Create a summary action message for multiple file modifications
 */
export function createDiffSummaryMessage(
  actionMessages: ActionMessage[]
): ActionMessage | null {
  if (actionMessages.length === 0) return null;

  const totalAdditions = actionMessages.reduce(
    (sum, msg) => sum + (msg.metadata?.additions || 0),
    0
  );
  const totalRemovals = actionMessages.reduce(
    (sum, msg) => sum + (msg.metadata?.removals || 0),
    0
  );

  return {
    id: `diff-summary-${Date.now()}`,
    type: 'action',
    actionType: 'description',
    timestamp: new Date(),
    content: `Modified ${actionMessages.length} file${actionMessages.length > 1 ? 's' : ''} (+${totalAdditions} -${totalRemovals})`,
    icon: '📄',
    metadata: {
      additions: totalAdditions,
      removals: totalRemovals,
    },
  };
}
