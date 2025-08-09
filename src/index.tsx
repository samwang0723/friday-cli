#!/usr/bin/env bun

import React from 'react';
import { render } from 'ink';
import App from './components/App.js';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

// Render the Ink app
render(<App />);
