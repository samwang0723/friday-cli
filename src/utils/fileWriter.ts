import * as fs from 'node:fs';
import * as path from 'node:path';
import { ParsedFileModification } from './chatStreamParser.js';

export interface FileWriteResult {
  filepath: string;
  success: boolean;
  error?: string;
  created: boolean;
  backup?: string;
}

/**
 * Apply file modifications to the filesystem
 */
export async function applyFileModifications(
  modifications: ParsedFileModification[],
  options: {
    createBackups?: boolean;
    projectRoot?: string;
    dryRun?: boolean;
  } = {}
): Promise<FileWriteResult[]> {
  const {
    createBackups = true,
    projectRoot = process.cwd(),
    dryRun = false
  } = options;

  const results: FileWriteResult[] = [];

  for (const modification of modifications) {
    const fullPath = path.resolve(projectRoot, modification.filepath);
    const isNewFile = !fs.existsSync(fullPath);

    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        if (!dryRun) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      let backupPath: string | undefined;

      // Create backup if file exists and backups are enabled
      if (!isNewFile && createBackups && !dryRun) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        backupPath = `${fullPath}.backup-${timestamp}`;
        fs.copyFileSync(fullPath, backupPath);
      }

      // Write the new content
      if (!dryRun) {
        fs.writeFileSync(fullPath, modification.code, 'utf-8');
      }

      results.push({
        filepath: modification.filepath,
        success: true,
        created: isNewFile,
        backup: backupPath
      });

    } catch (error) {
      results.push({
        filepath: modification.filepath,
        success: false,
        error: (error as Error).message,
        created: false
      });
    }
  }

  return results;
}

/**
 * Create a backup of a file
 */
export function createFileBackup(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup-${timestamp}`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  } catch (error) {
    console.warn(`Failed to create backup for ${filePath}:`, error);
    return null;
  }
}

/**
 * Validate if a file path is safe to write to (basic security check)
 */
export function isPathSafe(filePath: string, projectRoot: string): boolean {
  const resolvedPath = path.resolve(projectRoot, filePath);
  const normalizedRoot = path.normalize(projectRoot);
  
  // Check if the resolved path is within the project root
  return resolvedPath.startsWith(normalizedRoot);
}

/**
 * Get file write permissions status
 */
export function getFilePermissions(filePath: string): {
  exists: boolean;
  readable: boolean;
  writable: boolean;
  directory: string;
  directoryWritable: boolean;
} {
  const fullPath = path.resolve(filePath);
  const dir = path.dirname(fullPath);
  
  let exists = false;
  let readable = false;
  let writable = false;
  
  try {
    exists = fs.existsSync(fullPath);
    if (exists) {
      fs.accessSync(fullPath, fs.constants.R_OK);
      readable = true;
      fs.accessSync(fullPath, fs.constants.W_OK);
      writable = true;
    }
  } catch {
    // Access denied
  }
  
  let directoryWritable = false;
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    directoryWritable = true;
  } catch {
    // Directory not writable
  }
  
  return {
    exists,
    readable,
    writable,
    directory: dir,
    directoryWritable
  };
}