# Friday CLI

A terminal-based AI assistant powered by React and Ink, providing an interactive chat interface that connects to the AgentCore backend for intelligent conversations and task automation.

## Features

- Interactive terminal chat interface with real-time streaming responses
- Rich markdown rendering with syntax highlighting for code blocks
- Voice recording and playback using SoX (Sound eXchange) integration
- Advanced text input with cursor navigation and copy-paste support
- Command search with fuzzy matching and keyboard navigation
- OAuth authentication with Google via AgentCore backend
- Multiple operation modes (text, voice, thinking)
- Command history navigation with arrow keys
- Secure token management and session handling
- TypeScript support with modern ES modules
- Built with Bun runtime for optimal performance

## Prerequisites

- [Bun](https://bun.sh) v1.2.17 or later
- [SoX (Sound eXchange)](http://sox.sourceforge.net/) for voice recording features
- AgentCore backend service running (default: `http://localhost:3030/api/v1`)
- Internet connection for OAuth authentication

### Installing SoX

#### macOS
```bash
brew install sox
```

#### Ubuntu/Debian
```bash
sudo apt-get install sox
```

#### Windows
Download from [SoX official website](http://sox.sourceforge.net/) or use:
```bash
choco install sox
```

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd friday-cli

# Install dependencies using Bun
bun install
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory (optional):

```bash
# AgentCore backend URL (default: http://localhost:3030/api/v1)
AGENT_CORE_URL=http://localhost:3030/api/v1

# OAuth configuration is handled automatically
```

### AgentCore Backend

Ensure the AgentCore service is running before using Friday CLI. The application will automatically check connectivity on startup and during authentication.

## Usage

### Development Mode

```bash
# Start in development mode with hot reload
bun run dev

# Alternative: run directly
bun --watch src/index.tsx
```

### Production Build

```bash
# Build the application
bun run build

# Run the built version
./dist/index.js
```

### Basic Commands

Once the application is running, you can use these commands:

- `/help` - Display available commands and search through them
- `/login` - Authenticate with Google via AgentCore
- `/logout` - Sign out and clear stored tokens
- `/auth` - Check current authentication status
- `/voice` - Toggle voice recording mode
- `/exit` - Exit the application

### Command Search

Type `/` to enter command mode with fuzzy search capabilities:
- Use arrow keys (↑/↓) to navigate through filtered commands
- Press Enter to select a command
- Press Escape to exit command search

### Chat Interface

After authentication, simply type your messages and press Enter to chat with the AI assistant. The interface supports:

- **Rich Markdown Rendering**: Code blocks with syntax highlighting, lists, links, and formatting
- **Advanced Text Input**: Cursor navigation with left/right arrow keys, copy-paste support
- **Real-time Streaming Responses**: Watch responses appear character by character
- **Command History**: Navigate previous messages with ↑/↓ arrow keys
- **Voice Recording**: Press Space in voice mode to record and play back audio
- **Multiple Conversation Modes**: Text, voice, and thinking modes
- **Automatic Token Refresh**: Seamless session management

### Voice Recording

Switch to voice mode with `/voice`:
- Press **Space** to start/stop recording
- SoX handles audio capture and playback
- Visual indicators show recording (● REC) and playback (● PLAY) status
- Press **Space** again to stop and play back your recording

## Development

### Project Structure

```
src/
├── components/          # React/Ink UI components
│   ├── App.tsx         # Main application component
│   ├── ChatHistory.tsx # Message display component
│   ├── CommandSearch.tsx # Command search with fuzzy matching
│   ├── InputBox.tsx    # Advanced input with cursor navigation
│   ├── StatusBar.tsx   # Status and mode indicator
│   ├── VoiceRecorder.tsx # Voice recording interface
│   └── messages/       # Message rendering components
│       ├── MarkdownInk.tsx # Rich markdown renderer
│       ├── StreamingMessage.tsx # Real-time message streaming
│       ├── AuthMessage.tsx # Authentication messages
│       ├── BaseMessage.tsx # Base message component
│       ├── SystemMessage.tsx # System notifications
│       ├── UserMessage.tsx # User input display
│       └── ActionMessage/ # Action message types
├── context/            # React context providers
│   └── AppContext.tsx  # Global state management
├── hooks/              # Custom React hooks
│   ├── useCommandNavigation.ts # Command search navigation
│   ├── useCommandProcessor.ts # Command processing logic
│   ├── useScreenSize.ts # Terminal size detection
│   ├── useStreamingSession.ts # Message streaming
│   └── useVoiceRecorder.ts # Voice recording logic
├── services/           # External service integrations
│   ├── agentcore.ts    # AgentCore API client
│   └── oauth.ts        # Authentication service
├── utils/              # Utility functions and constants
│   ├── constants.ts    # Application constants
│   └── streamingHelpers.ts # Streaming utilities
├── types.ts            # TypeScript type definitions
├── oauth-server.ts     # Local OAuth callback server
└── index.tsx           # Application entry point
```

### Available Scripts

```bash
# Development with hot reload
bun run dev

# Build for production
bun run build

# Code formatting
bun run format
bun run format:check

# Linting
bun run lint
bun run lint:fix
```

### Code Style

The project uses:

- **Prettier** for code formatting
- **ESLint** for code linting
- **TypeScript** for type safety
- **ES Modules** with `.js` extensions in imports (Bun handles TypeScript compilation)

## Authentication Flow

1. Start Friday CLI: `bun run dev`
2. Check authentication status: `/auth`
3. Login if needed: `/login`
   - AgentCore connectivity check
   - Local OAuth server starts on port 8080
   - Browser opens for Google authentication
   - Tokens are stored locally in `token.json`
4. Start chatting with the AI assistant
5. Logout when finished: `/logout`

## Architecture

Friday CLI follows a modern React architecture with advanced terminal interface capabilities:

- **Frontend**: React components rendered in terminal via Ink with rich UI components
- **State Management**: React Context with useReducer pattern for predictable state updates
- **Backend Communication**: REST API calls to AgentCore with real-time streaming support
- **Authentication**: OAuth 2.0 flow via AgentCore proxy with secure local token storage
- **Voice Integration**: SoX (Sound eXchange) for cross-platform audio recording/playback
- **Text Processing**: Markdown parsing with syntax highlighting using marked and cli-highlight
- **Input Handling**: Advanced text editing with cursor positioning and clipboard support
- **Runtime**: Bun for optimal performance and built-in TypeScript compilation

### Key Technical Features

- **Streaming Responses**: WebSocket-like streaming for real-time AI conversation
- **Terminal Optimization**: Efficient rendering with Ink for responsive terminal UI
- **Cross-Platform Audio**: SoX integration for consistent voice recording across OS
- **Rich Text Rendering**: Full markdown support with code syntax highlighting
- **Advanced Input**: Multi-line editing, cursor navigation, and clipboard integration

## Troubleshooting

### AgentCore Connection Issues

```
AgentCore backend is not available at http://localhost:3030/api/v1.
Please ensure the AgentCore service is running.
```

**Solution**: Start the AgentCore backend service or update `AGENT_CORE_URL` environment variable.

### Authentication Timeout

```
OAuth initiation timeout
Token exchange timeout
```

**Solutions**:

- Check internet connection
- Verify AgentCore backend is accessible
- Ensure firewall allows localhost:8080 connections

### Token Issues

```
HTTP 401: Unauthorized
```

**Solution**: Re-authenticate using `/logout` then `/login`

### Voice Recording Issues

```
SoX not found or voice recording fails
```

**Solutions**:

- Install SoX using the instructions in Prerequisites section
- On macOS: Ensure microphone permissions are granted to Terminal
- On Linux: Check ALSA/PulseAudio configuration
- Verify SoX installation: `sox --version`

### Markdown Rendering Issues

If code blocks or markdown elements don't display correctly:

- Ensure terminal supports ANSI colors and formatting
- Update terminal software for better Unicode support
- Check terminal width for proper text wrapping

## Contributing

1. Follow the existing code style (use Prettier and ESLint)
2. Write TypeScript with proper type definitions
3. Test authentication flow before submitting changes
4. Use Bun commands instead of npm/yarn (see CLAUDE.md)

## License

MIT

---

Built with ❤️ using [Bun](https://bun.sh) and [React](https://react.dev)
