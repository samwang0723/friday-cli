/**
 * AgentCore Service
 * Handles communication with the agentCore backend for authentication and API calls
 */

export interface UserData {
  access_token: string;
  user_id: string;
  user_info: {
    email: string;
    name: string;
    picture: string;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  token: string | null;
  error: string | null;
}

export interface ClientContext {
  timezone?: string;
  clientDatetime?: string;
  locale?: string;
}

export interface ChatResponse {
  response: string;
}

export interface SseStreamResponse {
  transcript?: string;
  text?: string;
  audioChunk?: ArrayBuffer;
  index?: number;
  fullText?: string;
  type: 'transcript' | 'text' | 'audio' | 'complete' | 'error' | 'status';
  message?: string;
  metadata?: Record<string, unknown>;
}

// AgentCore supported locales
const AGENT_CORE_SUPPORTED_LOCALES = [
  'en',
  'es',
  'fr',
  'zh',
  'ja',
  'ko',
] as const;
type AgentCoreLocale = (typeof AGENT_CORE_SUPPORTED_LOCALES)[number];

// Map client locales to AgentCore supported locales
function mapToAgentCoreLocale(locale?: string): AgentCoreLocale | undefined {
  if (!locale) return undefined;

  if (AGENT_CORE_SUPPORTED_LOCALES.includes(locale as AgentCoreLocale)) {
    return locale as AgentCoreLocale;
  }

  if (locale.startsWith('zh')) return 'zh';
  return undefined;
}

export class AgentCoreService {
  private static readonly DEFAULT_STREAM_TIMEOUT = 30000; // 30 seconds

  private baseURL: string;
  private streamTimeout: number;
  private onLogout?: () => void;

  constructor(baseURL: string, onLogout?: () => void) {
    this.baseURL = baseURL;
    this.streamTimeout = AgentCoreService.DEFAULT_STREAM_TIMEOUT;
    this.onLogout = onLogout;
    console.info(
      `Initialized AgentCore service with base URL: ${this.baseURL}`
    );
  }

  private getHeaders(
    token?: string,
    timezone?: string,
    clientDatetime?: string,
    locale?: string,
    isMultipart?: boolean
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (timezone) {
      headers['X-Client-Timezone'] = timezone;
    }

    if (clientDatetime) {
      headers['X-Client-Datetime'] = clientDatetime;
    }

    if (locale) {
      const mappedLocale = mapToAgentCoreLocale(locale);
      if (mappedLocale) {
        headers['X-Locale'] = mappedLocale;
      }
    }

    return headers;
  }

  private getCurrentLocale(): string {
    // For CLI, we can use system locale or default to English
    return process.env.LANG?.split('.')[0]?.replace('_', '-') || 'en';
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Received 401 Unauthorized - triggering logout');
        this.onLogout?.();
      }
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error('Invalid JSON response from server');
    }
  }

  // OAuth Authentication Methods
  async initiateOAuth(
    redirectUri: string,
    scopes: string[],
    state?: string
  ): Promise<{ auth_url: string; state: string }> {
    try {
      console.info('Initiating OAuth with agentCore');

      const response = await fetch(`${this.baseURL}/auth/oauth/initiate`, {
        method: 'POST',
        headers: this.getHeaders(
          undefined,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          new Date().toISOString(),
          this.getCurrentLocale()
        ),
        body: JSON.stringify({
          redirect_uri: redirectUri,
          state: state || crypto.randomUUID(),
          scopes: scopes,
        }),
      });

      return await this.handleResponse<{ auth_url: string; state: string }>(
        response
      );
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      throw error;
    }
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    state?: string
  ): Promise<UserData> {
    try {
      console.info('Exchanging authorization code for tokens');

      const response = await fetch(`${this.baseURL}/auth/oauth/token`, {
        method: 'POST',
        headers: this.getHeaders(
          undefined,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          new Date().toISOString(),
          this.getCurrentLocale()
        ),
        body: JSON.stringify({
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          state,
        }),
      });

      return await this.handleResponse<UserData>(response);
    } catch (error) {
      console.error('Failed to exchange code for tokens:', error);
      throw error;
    }
  }

  // Chat Methods
  async initChat(token: string, context?: ClientContext): Promise<void> {
    try {
      console.info('Initializing agentCore chat session');

      const response = await fetch(`${this.baseURL}/chat/init`, {
        method: 'POST',
        headers: this.getHeaders(
          token,
          context?.timezone,
          context?.clientDatetime,
          context?.locale
        ),
        body: JSON.stringify({}),
      });

      await this.handleResponse(response);
      console.info('AgentCore chat session initialized successfully');
    } catch (error) {
      console.error('Failed to initialize agentCore chat:', error);
      throw error;
    }
  }

  async chatInit(
    token: string,
    onStatusUpdate: (status: string) => void,
    context?: ClientContext
  ): Promise<void> {
    try {
      onStatusUpdate('⏺ Connecting to AgentCore...');
      console.info('Initializing agentCore chat session with status updates');

      // First check health
      try {
        await this.healthCheck(context);
        onStatusUpdate('⏺Server reachable, establishing session...');
      } catch {
        onStatusUpdate(
          '⏺ Server health check failed, attempting connection anyway...'
        );
      }

      const response = await fetch(`${this.baseURL}/chat/init`, {
        method: 'POST',
        headers: this.getHeaders(
          token,
          context?.timezone,
          context?.clientDatetime,
          context?.locale
        ),
        body: JSON.stringify({}),
      });

      await this.handleResponse(response);
      onStatusUpdate('⏺ Connected to AgentCore successfully');
      console.info(
        'AgentCore chat session initialized successfully with status updates'
      );
    } catch (error) {
      console.error('Failed to initialize agentCore chat:', error);
      onStatusUpdate('⏺ Failed to connect to AgentCore');
      throw error;
    }
  }

  async *chatStream(
    message: string,
    token: string,
    context?: ClientContext,
    externalAbort?: AbortSignal
  ): AsyncGenerator<SseStreamResponse> {
    try {
      console.info('Starting agentCore chat stream');

      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | null = null;

      if (externalAbort) {
        if (externalAbort.aborted) {
          console.info(
            'External abort signal already triggered, cancelling stream'
          );
          return;
        }
        externalAbort.addEventListener('abort', () => {
          console.info('External abort signal received, cancelling stream');
          controller.abort();
        });
      }

      timeoutId = setTimeout(() => {
        console.warn(`Stream timeout after ${this.streamTimeout}ms, aborting`);
        controller.abort();
      }, this.streamTimeout);

      const headers = this.getHeaders(
        token,
        context?.timezone,
        context?.clientDatetime,
        context?.locale
      );
      headers['Accept'] = 'text/event-stream';
      headers['Cache-Control'] = 'no-cache';

      const response = await fetch(`${this.baseURL}/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: {
            role: 'user',
            content: [
              {
                type: 'text',
                text: message,
              },
            ],
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn(
            'Received 401 Unauthorized in stream - triggering logout'
          );
          this.onLogout?.();
        }
        await this.handleResponse(response);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          const messages = buffer.split('\n\n');
          buffer = messages.pop() || '';

          for (const message of messages) {
            if (!message.trim()) continue;

            const lines = message.split('\n');
            let data = '';
            let eventType = '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                data = line.slice(6);
              } else if (line.startsWith('event: ')) {
                eventType = line.slice(7);
              }
            }

            if (!eventType && data) {
              try {
                const parsed = JSON.parse(data) as { type?: string };
                eventType = parsed.type || '';
              } catch (parseError) {
                console.warn(
                  'Could not parse data to extract type:',
                  parseError
                );
              }
            }

            if (data === 'keep-alive' || !data) {
              continue;
            }

            if (eventType === 'error') {
              try {
                const errorData = JSON.parse(data);
                yield {
                  type: 'error',
                  message: errorData.message || 'Chat stream error',
                };
                throw new Error(
                  `Chat stream error: ${errorData.message || data}`
                );
              } catch {
                yield {
                  type: 'error',
                  message: 'Chat stream error',
                };
                throw new Error(`Chat stream error: ${data}`);
              }
            }

            if (data === '[DONE]') {
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
              return;
            }

            if (data && data !== '') {
              try {
                const parsed = JSON.parse(data);

                if (eventType === 'text') {
                  yield {
                    type: 'text',
                    text: parsed.data || parsed.content || parsed.text,
                    metadata: parsed.metadata,
                  };
                } else if (eventType === 'status') {
                  yield {
                    type: 'status',
                    message: parsed.message || parsed.status,
                    metadata: parsed.metadata,
                  };
                } else if (eventType === 'complete') {
                  yield {
                    type: 'complete',
                    fullText: parsed.fullText,
                    metadata: parsed.metadata,
                  };
                  if (timeoutId) {
                    clearTimeout(timeoutId);
                  }
                  return;
                }
              } catch (parseError) {
                console.warn(
                  'Failed to parse chat stream data:',
                  parseError,
                  data
                );
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    } catch (error) {
      const err = error as Error;

      if (err.name === 'AbortError') {
        if (externalAbort?.aborted) {
          console.info('Stream cancelled by external abort signal');
        } else {
          console.info('Stream cancelled due to timeout');
        }
        return;
      }

      console.error('AgentCore chat stream failed:', error);
      throw error;
    }
  }

  // Health Check
  async healthCheck(context?: ClientContext): Promise<{ status: string }> {
    try {
      console.info('Performing agentCore health check');

      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: this.getHeaders(
          undefined,
          context?.timezone,
          context?.clientDatetime,
          context?.locale
        ),
      });

      return await this.handleResponse<{ status: string }>(response);
    } catch (error) {
      console.error('AgentCore health check failed:', error);
      throw error;
    }
  }
}
