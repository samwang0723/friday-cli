// scripts/check-sox.js
import { execSync } from 'child_process';
import os from 'os';
import process from 'process';

function checkSox() {
  try {
    execSync('sox --version', { stdio: 'ignore' });
    console.log('SoX is already installed. Ready to record audio!');
  } catch (_error) {
    console.error(
      'SoX is not installed. This is required for audio recording.'
    );

    const platform = os.platform();
    if (platform === 'darwin') {
      // macOS
      console.error('Install SoX on macOS: brew install sox');
    } else if (platform === 'linux') {
      // Linux
      console.error(
        'Install SoX on Ubuntu/Debian: sudo apt-get install sox libsox-fmt-all'
      );
    } else if (platform === 'win32') {
      // Windows
      console.error(
        'Install SoX on Windows via Chocolatey: choco install sox.portable'
      );
      console.error('Or download from https://sourceforge.net/projects/sox/');
    } else {
      console.error(
        'Unsupported OS. Please install SoX manually: https://sourceforge.net/projects/sox/'
      );
    }

    process.exit(1); // Exit with error to prevent further issues
  }
}

checkSox();
