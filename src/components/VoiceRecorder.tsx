// src/components/VoiceRecorder.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { spawn, execSync } from 'child_process';
import os from 'os';

const RECORD_PATH = `${os.tmpdir()}/voice_record.wav`;

const VoiceRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Pending');
  const [waitingForLongPress, setWaitingForLongPress] = useState(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const soxProcRef = useRef<ReturnType<typeof spawn> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isError, setIsError] = useState(false);

  useInput((input, key) => {
    // Start simulated long press timer on SPACE (if not already recording)
    if (input === ' ' && !isRecording && !waitingForLongPress) {
      setWaitingForLongPress(true);
      pressTimerRef.current = setTimeout(() => {
        setWaitingForLongPress(false);
        startRecording();
      }, 500);
    }

    // If timer is running for long-press but user presses another key first, cancel
    if (
      waitingForLongPress &&
      (input !== ' ' || key.return || key.escape || key.tab)
    ) {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      setWaitingForLongPress(false);
      setStatus('Long press not detected. Hold SPACE longer to record.');
    }

    // If SPACE is pressed while already recording, stop and play
    if (isRecording && input === ' ') {
      stopRecordingAndPlay();
    }
  });

  const startRecording = () => {
    setIsRecording(true);
    setStatus('Recording... press SPACE to stop & play.');

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
  };

  const stopRecordingAndPlay = () => {
    if (!isRecording) return;
    setIsRecording(false);
    setStatus('Stopped. Playing back...');

    // Kill SoX recording
    if (soxProcRef.current) {
      soxProcRef.current.kill('SIGINT');
      soxProcRef.current = null;
    }

    const player = spawn('afplay', [RECORD_PATH]);
    setStatus('Playback started. Hold SPACE to record again.');
    setIsPlaying(true);
    // Detect playback completion
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    player.on('close', code => {
      // Playback finished—put your callback or status update here!
      setIsPlaying(false);
      setStatus('Playback complete. Hold SPACE to record again.');
    });

    // Handle playback errors
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    player.on('error', err => {
      setIsError(true);
      setStatus('ERROR: afplay failed to start. Is it installed?');
    });
  };

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      if (soxProcRef.current) soxProcRef.current.kill('SIGINT');
    };
  }, []);

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      borderStyle="round"
      borderColor="green"
    >
      <Text bold color="green">
        Voice Recorder (SoX, Bun/Node CLI)
      </Text>
      <Text>Status: {status}</Text>
      {isRecording && <Text color="red">● REC</Text>}
      {isPlaying && <Text color="green">● PLAY</Text>}
      {isError && <Text color="red">● ERROR</Text>}
    </Box>
  );
};

export default VoiceRecorder;
