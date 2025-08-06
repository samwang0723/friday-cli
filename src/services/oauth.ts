import * as fs from "fs";
import open from "open";
import { startOAuthServer } from "../oauth-server.js";
import { OAUTH_CONFIG } from "../utils/constants.js";
import { AgentCoreService, type UserData } from "./agentcore.js";

const { TOKEN_PATH, SCOPES, REDIRECT_URI, PORT, AGENT_CORE_BASE_URL } = OAUTH_CONFIG;

export interface OAuthResult {
  success: boolean;
  message: string;
  alreadyAuthenticated?: boolean;
}

// Storage utilities for CLI environment
const storage = {
  store: (data: UserData) => {
    try {
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to store user data:", error);
      throw error;
    }
  },
  retrieve: (): UserData | null => {
    try {
      if (!fs.existsSync(TOKEN_PATH)) return null;
      const data = fs.readFileSync(TOKEN_PATH, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to retrieve user data:", error);
      return null;
    }
  },
  remove: () => {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        fs.unlinkSync(TOKEN_PATH);
      }
    } catch (error) {
      console.error("Failed to remove user data:", error);
    }
  }
};

const isTokenExpired = (userData: UserData | null): boolean => {
  if (!userData) return true;
  
  // For agentCore tokens, we'll rely on the backend to handle expiration
  // This is a simple check - in a real implementation you might decode JWT tokens
  // and check expiration timestamps
  return false;
};

export async function googleLogin(): Promise<OAuthResult> {
  // Check for existing valid tokens
  const existingUserData = storage.retrieve();
  if (existingUserData && !isTokenExpired(existingUserData)) {
    return {
      success: true,
      message: "🔓 Already authenticated!",
      alreadyAuthenticated: true
    };
  }

  try {
    console.log(`🔗 Attempting to connect to AgentCore at: ${AGENT_CORE_BASE_URL}`);
    
    // Initialize agentCore service
    const agentCore = new AgentCoreService(AGENT_CORE_BASE_URL);
    
    // Test connectivity first with a short timeout
    console.log("🏥 Testing AgentCore connectivity...");
    try {
      await Promise.race([
        agentCore.healthCheck(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("AgentCore health check timeout")), 5000)
        )
      ]);
      console.log("✅ AgentCore is reachable");
    } catch (healthError) {
      throw new Error(
        `AgentCore backend is not available at ${AGENT_CORE_BASE_URL}. ` +
        `Please ensure the AgentCore service is running. Error: ${(healthError as Error).message}`
      );
    }
    
    // Start local OAuth callback server
    const serverPromise = startOAuthServer(PORT);

    // Generate a state parameter for security
    const state = crypto.randomUUID();

    console.log("🚀 Initiating OAuth flow with AgentCore...");
    
    // Initiate OAuth flow with agentCore with timeout
    const { auth_url } = await Promise.race([
      agentCore.initiateOAuth(REDIRECT_URI, SCOPES, state),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("OAuth initiation timeout")), 10000)
      )
    ]);
    
    // Open browser with agentCore auth URL
    await open(auth_url);
    console.log("🌐 Browser opened for authentication...");
    
    // Wait for callback with authorization code
    const code = await serverPromise;
    console.log("🔐 Authorization code received, exchanging for tokens...");
    
    // Exchange code for tokens via agentCore with timeout
    const userData = await Promise.race([
      agentCore.exchangeCodeForTokens(code, REDIRECT_URI, state),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Token exchange timeout")), 10000)
      )
    ]);
    
    // Store user data locally
    storage.store(userData);
    console.log("💾 User data stored successfully");
    
    return {
      success: true,
      message: "✅ Login successful! Tokens saved."
    };
  } catch (err) {
    const errorMessage = (err as Error).message;
    console.error("❌ AgentCore login failed:", errorMessage);
    
    return {
      success: false,
      message: `AgentCore login failed: ${errorMessage}`
    };
  }
}

// Additional helper functions for the CLI
export async function logout(): Promise<OAuthResult> {
  try {
    storage.remove();
    return {
      success: true,
      message: "🔓 Logged out successfully!"
    };
  } catch (err) {
    return {
      success: false,
      message: `Logout failed: ${(err as Error).message}`
    };
  }
}

export function getAuthStatus(): { authenticated: boolean; user?: UserData } {
  const userData = storage.retrieve();
  return {
    authenticated: userData !== null && !isTokenExpired(userData),
    user: userData || undefined
  };
}

export function getToken(): string | null {
  const userData = storage.retrieve();
  return userData?.access_token || null;
}