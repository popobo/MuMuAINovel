/**
 * Gemini Provider Implementation (Placeholder)
 * This is a placeholder for future Gemini integration
 */

import type {
  AIProviderInterface,
  AIMessage,
  AICompleteOptions,
  AIStreamOptions,
  AICompleteResponse,
  AIStreamCallback,
  AIProvider,
} from '../types';

export class GeminiProvider implements AIProviderInterface {
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey: string, options?: {
    defaultModel?: string;
  }) {
    this.apiKey = apiKey;
    this.defaultModel = options?.defaultModel || 'gemini-pro';
  }

  getProvider(): AIProvider {
    return 'gemini';
  }

  async complete(
    messages: AIMessage[],
    options?: AICompleteOptions
  ): Promise<AICompleteResponse> {
    throw new Error('Gemini provider is not yet implemented. Please use OpenAI or Anthropic providers.');
  }

  async stream(
    messages: AIMessage[],
    callback: AIStreamCallback,
    options?: AIStreamOptions
  ): Promise<AICompleteResponse> {
    throw new Error('Gemini provider is not yet implemented. Please use OpenAI or Anthropic providers.');
  }
}
