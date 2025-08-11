import { promises as fs } from 'fs';
import { join, relative } from 'path';

export interface FileItem {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
}

async function getAllFiles(dirPath: string, maxDepth = 5, currentDepth = 0): Promise<FileItem[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files: FileItem[] = [];
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const relativePath = relative(process.cwd(), fullPath);
      
      // Skip hidden files and common directories to ignore
      if (entry.name.startsWith('.') || 
          entry.name === 'node_modules' || 
          entry.name === 'dist' || 
          entry.name === 'build' ||
          entry.name === '.git') {
        continue;
      }

      if (entry.isDirectory()) {
        // Add the directory itself
        files.push({
          name: entry.name,
          path: fullPath,
          relativePath,
          isDirectory: true,
        });

        // Recursively get files from subdirectories
        const subFiles = await getAllFiles(fullPath, maxDepth, currentDepth + 1);
        files.push(...subFiles);
      } else {
        files.push({
          name: entry.name,
          path: fullPath,
          relativePath,
          isDirectory: false,
        });
      }
    }

    return files;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return [];
  }
}

export async function discoverFiles(searchTerm: string = ''): Promise<FileItem[]> {
  const currentDir = process.cwd();
  const allFiles = await getAllFiles(currentDir);
  
  if (!searchTerm.trim()) {
    // Return files from current directory only when no search term
    return allFiles.filter(file => !file.relativePath.includes('/'));
  }

  const lowerSearchTerm = searchTerm.toLowerCase();
  
  // Filter files that match the search term in name or relative path
  return allFiles.filter(file => 
    file.name.toLowerCase().includes(lowerSearchTerm) ||
    file.relativePath.toLowerCase().includes(lowerSearchTerm)
  ).slice(0, 50); // Limit results for performance
}