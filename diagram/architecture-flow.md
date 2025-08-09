# Friday CLI Architecture Flow Diagrams

## Application Flow Chart

```mermaid
graph TD
    A[User Terminal] --> B[Friday CLI Entry Point]
    B --> C[React Ink App]
    C --> D[App Context Provider]
    D --> E[Main UI Components]

    E --> F[Status Bar]
    E --> G[Chat History]
    E --> H[Input Box]

    H --> I{Command Type?}
    I -->|/login| J[OAuth Service]
    I -->|/logout| K[Clear Tokens]
    I -->|/auth| L[Check Auth Status]
    I -->|Chat Message| M[AgentCore Service]

    J --> N[Local OAuth Server]
    N --> O[Browser Launch]
    O --> P[Google OAuth]
    P --> Q[Callback Handler]
    Q --> R[Token Storage]

    M --> S[AgentCore Backend]
    S --> T[Streaming Response]
    T --> U[Update Chat History]

    R --> V[Update App State]
    U --> V
    V --> W[Re-render UI]
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant CLI as Friday CLI
    participant OAuth as OAuth Service
    participant Server as Local Server
    participant Browser as Browser
    participant Google as Google OAuth
    participant AC as AgentCore
    participant FS as File System

    U->>CLI: /login command
    CLI->>OAuth: initiate login
    OAuth->>AC: health check
    AC-->>OAuth: backend available
    OAuth->>Server: start local server (port 8989)
    Server->>Browser: open OAuth URL
    Browser->>Google: user authentication
    Google->>Server: callback with code
    Server->>OAuth: process callback
    OAuth->>AC: exchange code for tokens
    AC-->>OAuth: return access/refresh tokens
    OAuth->>FS: store tokens locally
    OAuth->>CLI: authentication complete
    CLI->>U: login successful
```

## Component Interaction

```mermaid
graph LR
    A[App.tsx] --> B[AppContext]
    B --> C[useReducer]

    A --> D[StatusBar]
    A --> E[ChatHistory]
    A --> F[InputBox]

    D --> B
    E --> B
    F --> B

    F --> G[OAuth Service]
    F --> H[AgentCore Service]

    G --> I[oauth-server.ts]
    H --> J[AgentCore Backend]

    B --> K[State Management]
    K --> L[messages]
    K --> M[isAuthenticated]
    K --> N[mode]
```

## Data Flow Architecture

```mermaid
flowchart TB
    subgraph "Frontend (React/Ink)"
        A[User Input] --> B[InputBox Component]
        B --> C[App Context]
        C --> D[State Reducer]
        D --> E[UI Components]
        E --> F[Terminal Display]
    end

    subgraph "Services Layer"
        G[OAuth Service]
        H[AgentCore Service]
    end

    subgraph "External Systems"
        I[AgentCore Backend]
        J[Google OAuth]
        K[Local File System]
    end

    B --> G
    B --> H
    G --> J
    G --> K
    H --> I

    G --> C
    H --> C

    style A fill:#e1f5fe
    style F fill:#e8f5e8
    style I fill:#fff3e0
    style J fill:#fce4ec
```

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Initializing
    Initializing --> Unauthenticated: No valid tokens
    Initializing --> Authenticated: Valid tokens found

    Unauthenticated --> AuthInProgress: /login command
    AuthInProgress --> Authenticated: OAuth success
    AuthInProgress --> Unauthenticated: OAuth failed

    Authenticated --> Chatting: User sends message
    Chatting --> Authenticated: Response received
    Authenticated --> Unauthenticated: /logout command

    state AuthInProgress {
        [*] --> ServerStarting
        ServerStarting --> BrowserOpening
        BrowserOpening --> WaitingCallback
        WaitingCallback --> ProcessingTokens
        ProcessingTokens --> [*]
    }
```

## Message Processing Pipeline

```mermaid
graph LR
    A[User Input] --> B{Is Command?}
    B -->|Yes| C[Command Router]
    B -->|No| D[Chat Message]

    C --> E[/login]
    C --> F[/logout]
    C --> G[/auth]
    C --> H[/help]
    C --> I[/exit]

    E --> J[OAuth Flow]
    F --> K[Clear Auth]
    G --> L[Check Status]
    H --> M[Show Help]
    I --> N[Exit App]

    D --> O[AgentCore API]
    O --> P[Streaming Response]
    P --> Q[Parse Chunks]
    Q --> R[Update History]

    style A fill:#bbdefb
    style D fill:#c8e6c9
    style O fill:#ffcdd2
```
