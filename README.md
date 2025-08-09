# Friday CLI

A terminal-based AI assistant powered by React and Ink, providing an interactive chat interface that connects to the AgentCore backend for intelligent conversations and task automation.

## Features

- Interactive terminal chat interface with real-time streaming responses
- OAuth authentication with Google via AgentCore backend
- Multiple operation modes (text, voice, thinking)
- Command history navigation
- Secure token management and session handling
- TypeScript support with modern ES modules
- Built with Bun runtime for optimal performance

## Prerequisites

- [Bun](https://bun.sh) v1.2.17 or later
- AgentCore backend service running (default: `http://localhost:3030/api/v1`)
- Internet connection for OAuth authentication

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

- `/help` - Display available commands
- `/login` - Authenticate with Google via AgentCore
- `/logout` - Sign out and clear stored tokens
- `/auth` - Check current authentication status
- `/exit` - Exit the application

### Chat Interface

After authentication, simply type your messages and press Enter to chat with the AI assistant. The interface supports:

- Real-time streaming responses
- Command history (use ↑/↓ arrow keys)
- Multiple conversation modes
- Automatic token refresh

## Development

### Project Structure

```
src/
├── components/          # React/Ink UI components
│   ├── App.tsx         # Main application component
│   ├── ChatHistory.tsx # Message display component
│   ├── InputBox.tsx    # Input handling and commands
│   ├── MessageItem.tsx # Individual message rendering
│   └── StatusBar.tsx   # Status and mode indicator
├── context/            # React context providers
│   └── AppContext.tsx  # Global state management
├── services/           # External service integrations
│   ├── agentcore.ts    # AgentCore API client
│   └── oauth.ts        # Authentication service
├── utils/              # Utility functions and constants
│   └── constants.ts    # Application constants
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

Friday CLI follows a modern React architecture:

- **Frontend**: React components rendered in terminal via Ink
- **State Management**: React Context with useReducer
- **Backend Communication**: REST API calls to AgentCore with streaming support
- **Authentication**: OAuth 2.0 flow via AgentCore proxy
- **Runtime**: Bun for fast execution and built-in TypeScript support

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

## Contributing

1. Follow the existing code style (use Prettier and ESLint)
2. Write TypeScript with proper type definitions
3. Test authentication flow before submitting changes
4. Use Bun commands instead of npm/yarn (see CLAUDE.md)

## License

MIT

---

Built with ❤️ using [Bun](https://bun.sh) and [React](https://react.dev)
