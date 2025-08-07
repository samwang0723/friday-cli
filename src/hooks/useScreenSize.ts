import { useState, useEffect, useCallback } from 'react';
import { useStdout } from 'ink';

export interface ScreenSize {
  height: number;
  width: number;
}

export function useScreenSize(): ScreenSize {
  const { stdout } = useStdout();
  
  const getSize = useCallback((): ScreenSize => ({
    height: stdout.rows,
    width: stdout.columns
  }), [stdout.rows, stdout.columns]);

  const [size, setSize] = useState<ScreenSize>(getSize);

  useEffect(() => {
    const onResize = () => setSize(getSize());
    
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout, getSize]);

  return size;
}