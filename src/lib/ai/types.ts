/**
 * AI Service Type Definitions
 */

export type MessageRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: MessageRole;
  content: string;
}

export type AIProvider = 'openai' | 'anthropic' | 'gemini';

export interface AICompleteOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

export interface AIStreamOptions extends AICompleteOptions {
  stream: true;
}

export interface AICompleteResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type AIStreamCallback = (chunk: string) => void;

export interface AIProviderInterface {
  /**
   * Complete a prompt with the AI provider
   */
  complete(messages: AIMessage[], options?: AICompleteOptions): Promise<AICompleteResponse>;

  /**
   * Stream a completion from the AI provider
   */
  stream(
    messages: AIMessage[],
    callback: AIStreamCallback,
    options?: AIStreamOptions
  ): Promise<AICompleteResponse>;

  /**
   * Get the provider name
   */
  getProvider(): AIProvider;
}
