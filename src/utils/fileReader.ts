import { promises as fs } from 'fs';
import { join } from 'path';

export interface FileReference {
  path: string;
  startIndex: number;
  endIndex: number;
}

export interface FileReadResult {
  content: string;
  isDirectory: boolean;
  fileCount?: number;
  totalLines?: number;
}

export async function readFileContent(filePath: string): Promise<string | null> {
  const result = await readFileContentWithMetadata(filePath);
  return result ? result.content : null;
}

export async function readFileContentWithMetadata(filePath: string): Promise<FileReadResult | null> {
  try {
    const fullPath = join(process.cwd(), filePath);
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      const result = await readDirectoryContentWithMetadata(fullPath, filePath);
      return {
        content: result.content,
        isDirectory: true,
        fileCount: result.fileCount,
        totalLines: result.totalLines
      };
    } else if (stats.isFile()) {
      const content = await fs.readFile(fullPath, 'utf-8');
      return {
        content,
        isDirectory: false,
        totalLines: content.split('\n').length
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}


async function readDirectoryContentWithMetadata(fullPath: string, relativePath: string): Promise<{content: string, fileCount: number, totalLines: number}> {
  try {
    // Max depth of 2 to prevent overwhelming output - can be adjusted as needed
    const maxDepth = 2;
    return await readDirectoryRecursively(fullPath, relativePath, 0, maxDepth);
  } catch (error) {
    console.error(`Error reading directory ${relativePath}:`, error);
    return {
      content: `Error reading directory: ${error}`,
      fileCount: 0,
      totalLines: 0
    };
  }
}

async function readDirectoryRecursively(
  fullPath: string, 
  relativePath: string, 
  currentDepth: number,
  maxDepth: number
): Promise<{content: string, fileCount: number, totalLines: number}> {
  if (currentDepth > maxDepth) {
    return {
      content: `... (max depth ${maxDepth} reached)`,
      fileCount: 0,
      totalLines: 0
    };
  }

  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  const result: string[] = [];
  const fileContents: string[] = [];
  const subdirectories: string[] = [];
  let processedFiles = 0;
  let skippedFiles = 0;
  let totalLinesCount = 0;
  
  // First pass: collect files and their contents
  for (const entry of entries) {
    // Skip hidden files and common directories to ignore
    if (entry.name.startsWith('.') || 
        entry.name === 'node_modules' || 
        entry.name === 'dist' || 
        entry.name === 'build') {
      skippedFiles++;
      continue;
    }

    const entryPath = join(fullPath, entry.name);
    const entryRelativePath = relativePath === '' ? entry.name : `${relativePath}/${entry.name}`;

    if (entry.isFile()) {
      try {
        // Skip binary files and very large files
        const stats = await fs.stat(entryPath);
        if (stats.size > 1024 * 1024) { // Skip files larger than 1MB
          fileContents.push(`\n--- ${entryRelativePath} ---\n[File too large (${Math.round(stats.size / 1024)}KB), skipped]`);
          continue;
        }

        // Try to read as text, skip if it appears to be binary
        const content = await fs.readFile(entryPath, 'utf-8');
        
        // Simple binary detection - if file contains many null bytes, skip it
        const nullByteRatio = (content.match(/\0/g) || []).length / content.length;
        if (nullByteRatio > 0.01) { // More than 1% null bytes
          fileContents.push(`\n--- ${entryRelativePath} ---\n[Binary file, skipped]`);
          continue;
        }

        // Truncate very long files
        let fileContent = content;
        if (content.length > 5000) {
          fileContent = content.slice(0, 5000) + '\n... (file truncated)';
        }

        fileContents.push(`\n--- ${entryRelativePath} ---\n${fileContent}`);
        processedFiles++;
        totalLinesCount += content.split('\n').length;
      } catch (error) {
        fileContents.push(`\n--- ${entryRelativePath} ---\n[Error reading file: ${error}]`);
      }
    } else if (entry.isDirectory() && currentDepth < maxDepth) {
      // Collect subdirectory for recursive processing
      subdirectories.push(entryPath);
    }
  }

  // Add summary
  const summary = `Directory: ${relativePath || '.'} (${processedFiles} files${skippedFiles > 0 ? `, ${skippedFiles} skipped` : ''})`;
  result.push(`📁 ${summary}\n`);

  // Add all file contents
  if (fileContents.length > 0) {
    result.push(...fileContents);
  }

  // Process subdirectories recursively
  for (const subDirPath of subdirectories) {
    const subDirName = subDirPath.split('/').pop() || '';
    const subDirRelativePath = relativePath === '' ? subDirName : `${relativePath}/${subDirName}`;
    
    try {
      const subDirResult = await readDirectoryRecursively(subDirPath, subDirRelativePath, currentDepth + 1, maxDepth);
      result.push(`\n${subDirResult.content}`);
      processedFiles += subDirResult.fileCount;
      totalLinesCount += subDirResult.totalLines;
    } catch (error) {
      result.push(`\n📁 ${subDirRelativePath} - Error: ${error}`);
    }
  }

  if (processedFiles === 0 && subdirectories.length === 0) {
    result.push('(Directory contains no readable files)');
  }

  return {
    content: result.join('\n'),
    fileCount: processedFiles,
    totalLines: totalLinesCount
  };
}

export function extractFileReferences(message: string): FileReference[] {
  const fileReferences: FileReference[] = [];
  const fileRegex = /@([^\s]+)/g;
  let match;

  while ((match = fileRegex.exec(message)) !== null) {
    const filePath = match[1];
    
    // Skip if it looks like an email (contains @ in the middle)
    if (filePath.includes('@')) {
      continue;
    }
    
    // Must contain a file extension, directory separator, or end with / to be considered a file/folder path
    const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(filePath);
    const hasDirectorySeparator = filePath.includes('/') || filePath.includes('\\');
    const endsWithSlash = filePath.endsWith('/');
    
    if (hasFileExtension || hasDirectorySeparator || endsWithSlash) {
      fileReferences.push({
        path: filePath,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  return fileReferences;
}

export async function processMessageWithFileContext(originalMessage: string): Promise<string> {
  const fileReferences = extractFileReferences(originalMessage);
  
  if (fileReferences.length === 0) {
    return originalMessage;
  }

  let processedMessage = originalMessage;
  const fileContexts: string[] = [];
  const failedFiles: string[] = [];
  
  // Process files and collect their contents
  for (const fileRef of fileReferences) {
    const content = await readFileContent(fileRef.path);
    if (content !== null) {
      // Determine if this is a directory or file for better labeling and limits
      const isDirectory = fileRef.path.endsWith('/');
      const contextLabel = isDirectory ? 'Directory Contents' : 'File Context';
      
      // Truncate very large content for performance
      let fileContent = content;
      const sizeLimit = isDirectory ? 50000 : 10000; // Larger limit for directories since they contain multiple files
      
      if (content.length > sizeLimit) {
        const truncateMessage = isDirectory ? '\n... (directory listing truncated)' : '\n... (file truncated)';
        fileContent = content.slice(0, sizeLimit) + truncateMessage;
      }
      
      const fileContext = `${contextLabel} (${fileRef.path}):\n\`\`\`\n${fileContent}\n\`\`\``;
      fileContexts.push(fileContext);
      
      // Remove the file reference from the original message
      processedMessage = processedMessage.replace(`@${fileRef.path}`, '').trim();
    } else {
      failedFiles.push(fileRef.path);
      // Keep the failed file reference in the message
    }
  }

  // Add note about failed files if any
  if (failedFiles.length > 0) {
    const failedFileNote = `\n\nNote: Could not read the following files: ${failedFiles.join(', ')}`;
    processedMessage += failedFileNote;
  }

  // Combine file contexts with the processed message
  if (fileContexts.length > 0) {
    const fileContextSection = fileContexts.join('\n\n');
    processedMessage = processedMessage.trim();
    
    if (processedMessage) {
      return `${fileContextSection}\n\n${processedMessage}`;
    } else {
      return fileContextSection;
    }
  }

  return processedMessage;
}