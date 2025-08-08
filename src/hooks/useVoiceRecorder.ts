import { useState, useRef, useEffect, useCallback } from 'react';
import { spawn, execSync } from 'child_process';
import os from 'os';

const RECORD_PATH = `${os.tmpdir()}/voice_record.wav`;

export interface VoiceRecorderState {
  isRecording: boolean;
  status: string;
  isPlaying: boolean;
  isError: boolean;
}

export interface VoiceRecorderActions {
  startRecording: () => void;
  stopRecordingAndPlay: () => void;
  handleSpacePress: () => void;
  resetError: () => void;
}

export function useVoiceRecorder(): VoiceRecorderState & VoiceRecorderActions {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState(
    'Ready to record. Press SPACE to start.'
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isError, setIsError] = useState(false);

  const soxProcRef = useRef<ReturnType<typeof spawn> | null>(null);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setStatus('Recording... press SPACE to stop & play.');
    setIsError(false);

    // Remove previous file if exists
    try {
      execSync(`rm -f "${RECORD_PATH}"`);
    } catch {
      console.error('Failed to remove previous recording');
    }

    // Start sox process
    soxProcRef.current = spawn(
      'sox',
      ['-t', 'coreaudio', 'default', RECORD_PATH],
      {
        stdio: 'ignore',
        detached: false,
      }
    );

    soxProcRef.current.on('error', () => {
      setStatus('ERROR: SoX failed to start. Is it installed?');
      setIsRecording(false);
      setIsError(true);
    });
  }, []);

  const stopRecordingAndPlay = useCallback(() => {
    if (!isRecording) return;

    setIsRecording(false);
    setStatus('Stopped. Playing back...');

    // Kill SoX recording
    if (soxProcRef.current) {
      soxProcRef.current.kill('SIGINT');
      soxProcRef.current = null;
    }

    const player = spawn('afplay', [RECORD_PATH]);
    setStatus('Playing back audio...');
    setIsPlaying(true);

    player.on('close', () => {
      setIsPlaying(false);
      setStatus('Playback complete. Press SPACE to record again.');
    });

    player.on('error', () => {
      setIsError(true);
      setStatus('ERROR: afplay failed to start. Is it installed?');
      setIsPlaying(false);
    });
  }, [isRecording]);

  const handleSpacePress = useCallback(() => {
    if (isRecording) {
      stopRecordingAndPlay();
    } else if (!isPlaying) {
      startRecording();
    }
  }, [isRecording, isPlaying, startRecording, stopRecordingAndPlay]);

  const resetError = useCallback(() => {
    setIsError(false);
    setStatus('Ready to record. Press SPACE to start.');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soxProcRef.current) {
        soxProcRef.current.kill('SIGINT');
      }
    };
  }, []);

  return {
    // State
    isRecording,
    status,
    isPlaying,
    isError,
    // Actions
    startRecording,
    stopRecordingAndPlay,
    handleSpacePress,
    resetError,
  };
}
