import { useEffect, useCallback, useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { discoverFiles, FileItem } from '../utils/fileDiscovery.js';

export function useFileNavigation() {
  const { state, actions } = useApp();
  const { fileQuery, selectedFileIndex, isFileMode } = state;
  const [availableFiles, setAvailableFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter and load files based on query
  const loadFilteredFiles = useCallback(async () => {
    if (!isFileMode) {
      setAvailableFiles([]);
      return;
    }

    setIsLoading(true);
    try {
      // Extract the search term after the last @ symbol
      const atIndex = fileQuery.lastIndexOf('@');
      if (atIndex === -1) {
        setAvailableFiles([]);
        return;
      }
      
      // Get text after @ until next space or end of string
      let queryEndIndex = atIndex + 1;
      while (queryEndIndex < fileQuery.length && fileQuery[queryEndIndex] !== ' ') {
        queryEndIndex++;
      }
      
      const query = fileQuery.slice(atIndex + 1, queryEndIndex).trim();
      const files = await discoverFiles(query);
      setAvailableFiles(files);
    } catch (error) {
      console.error('Error loading files:', error);
      setAvailableFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [fileQuery, isFileMode]);

  // Load files when query changes
  useEffect(() => {
    loadFilteredFiles();
  }, [loadFilteredFiles]);

  // Navigate file list
  const navigateFileList = useCallback(
    (direction: 'up' | 'down') => {
      if (!isFileMode || availableFiles.length === 0) return;

      const currentIndex = selectedFileIndex;
      let newIndex: number;

      if (direction === 'up') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : availableFiles.length - 1;
      } else {
        newIndex = currentIndex < availableFiles.length - 1 ? currentIndex + 1 : 0;
      }

      actions.setSelectedFileIndex(newIndex);
    },
    [isFileMode, selectedFileIndex, availableFiles.length, actions]
  );

  // Get currently selected file
  const getSelectedFile = useCallback(() => {
    if (availableFiles.length === 0 || selectedFileIndex >= availableFiles.length) {
      return null;
    }
    return availableFiles[selectedFileIndex];
  }, [availableFiles, selectedFileIndex]);

  // Auto-select file when it's the only match
  useEffect(() => {
    if (!isFileMode) return;

    if (availableFiles.length === 1 && selectedFileIndex !== 0) {
      actions.setSelectedFileIndex(0);
    }
  }, [
    fileQuery,
    isFileMode,
    availableFiles.length,
    selectedFileIndex,
    actions,
  ]);

  return {
    availableFiles,
    navigateFileList,
    getSelectedFile,
    isLoading,
    selectedFileIndex: Math.min(
      selectedFileIndex,
      Math.max(0, availableFiles.length - 1)
    ),
  };
}