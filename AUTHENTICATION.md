# Authentication Guide

## Overview
Friday CLI now uses AgentCore backend for authentication instead of direct Google OAuth integration.

## Prerequisites
- AgentCore backend service must be running
- Default URL: `http://localhost:3030/api/v1`
- Set `AGENT_CORE_URL` environment variable to use different URL

## Available Commands

### `/login`
Initiates OAuth authentication flow through AgentCore:
1. Checks AgentCore connectivity
2. Opens browser for OAuth authentication
3. Displays success page in browser
4. Returns to console with confirmation
5. Stores tokens locally in `token.json`

### `/logout`
Logs out and removes stored tokens:
- Clears local `token.json` file
- Resets authentication state

### `/auth`
Shows current authentication status:
- Displays user information if authenticated
- Shows "not authenticated" message if logged out

### `/help`
Shows available commands and usage instructions

## Error Handling

### AgentCore Not Available
```
AgentCore backend is not available at http://localhost:3030/api/v1. 
Please ensure the AgentCore service is running.
```

### Timeout Errors
- Health check timeout: 5 seconds
- OAuth initiation timeout: 10 seconds  
- Token exchange timeout: 10 seconds

## Environment Variables

- `AGENT_CORE_URL`: AgentCore backend URL (default: `http://localhost:3030/api/v1`)

## Files

- `token.json`: Local token storage (created after successful login)
- Contains AgentCore OAuth tokens and user information

## Usage Flow

1. Start Friday CLI: `bun run dev`
2. Check auth status: `/auth`
3. Login: `/login` (ensure AgentCore is running)
4. Browser will open for OAuth
5. Complete authentication in browser
6. Return to console
7. Verify with `/auth`
8. Logout when done: `/logout`

## Troubleshooting

### Login hangs
- Check if AgentCore backend is running
- Verify URL is correct (`http://localhost:3030/api/v1`)
- Check network connectivity

### "/auth crashes"
- Issue has been fixed with proper null checks
- Command now safely handles unauthenticated state

### Browser doesn't open
- Ensure `open` package is installed
- Check if default browser is configured
- Try manual navigation to the auth URL (shown in console)