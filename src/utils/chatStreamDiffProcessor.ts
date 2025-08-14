import { ActionMessage, DiffLine } from '../types.js';
import {
  parseFileModifications,
  generateDiffLines,
} from './chatStreamParser.js';
import { applyFileModifications, FileWriteResult } from './fileWriter.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Process chat stream response to create nested diff action messages
 */
export async function processChatStreamForDiffs(
  response: string,
  options: {
    projectRoot?: string;
    autoApply?: boolean;
    createBackups?: boolean;
  } = {}
): Promise<ActionMessage[]> {
  const {
    projectRoot = process.cwd(),
    autoApply = true,
    createBackups = true
  } = options;
  const modifications = parseFileModifications(response);
  const actionMessages: ActionMessage[] = [];

  // First, generate all diffs using original file content
  const diffData: Array<{
    modification: typeof modifications[0];
    originalCode: string;
    isNewFile: boolean;
    diffLines: DiffLine[];
    additions: number;
    removals: number;
  }> = [];

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

      // Generate diff lines using original content
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

      // Store diff data for later use
      diffData.push({
        modification,
        originalCode,
        isNewFile,
        diffLines: formattedDiffLines,
        additions,
        removals
      });

    } catch (error) {
      console.warn(
        `Failed to generate diff for ${modification.filepath}:`,
        error
      );
    }
  }

  // Now apply file modifications if autoApply is enabled (after diffs are generated)
  let writeResults: FileWriteResult[] = [];
  if (autoApply && modifications.length > 0) {
    try {
      writeResults = await applyFileModifications(modifications, {
        projectRoot,
        createBackups
      });
    } catch (error) {
      console.warn('Failed to apply file modifications:', error);
    }
  }

  // Create action messages using the pre-calculated diff data
  for (const data of diffData) {
    const { modification, isNewFile, diffLines, additions, removals } = data;

    // Find write result for this file
    const writeResult = writeResults.find(r => r.filepath === modification.filepath);
    const action = isNewFile ? 'Created' : 'Updated';
    
    // Determine status based on write result
    let statusIcon = isNewFile ? '📄' : '📝';
    let statusText = `${action} (${modification.filepath})`;
    
    if (autoApply && writeResult) {
      if (writeResult.success) {
        statusIcon = '✅';
        statusText = `${action} (${modification.filepath})`;
      } else {
        statusIcon = '❌';
        statusText = `Failed to ${action.toLowerCase()} (${modification.filepath}): ${writeResult.error}`;
      }
    }

    const parentAction: ActionMessage = {
      id: `file-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'action',
      actionType: 'file_update',
      timestamp: new Date(),
      content: statusText,
      icon: statusIcon,
      metadata: {
        filePath: modification.filepath,
        additions,
        removals,
        diffLines: diffLines,
        writeResult: writeResult,
        autoApplied: autoApply
      },
    };

    actionMessages.push(parentAction);
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
