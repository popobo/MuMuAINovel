/**
 * AI Service - Main entry point for AI provider abstraction
 */

import type {
  AIProvider,
  AIMessage,
  AICompleteOptions,
  AIStreamOptions,
  AICompleteResponse,
  AIStreamCallback,
} from './types';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';

export class AIService {
  private provider: AIProvider;
  private openaiProvider: OpenAIProvider | null = null;
  private anthropicProvider: AnthropicProvider | null = null;
  private geminiProvider: GeminiProvider | null = null;

  constructor() {
    // Initialize providers from environment variables
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Determine default provider
    const defaultProvider = (process.env.DEFAULT_AI_PROVIDER || 'openai') as AIProvider;
    const defaultModel = process.env.DEFAULT_MODEL;
    const defaultTemperature = process.env.DEFAULT_TEMPERATURE
      ? parseFloat(process.env.DEFAULT_TEMPERATURE)
      : undefined;
    const defaultMaxTokens = process.env.DEFAULT_MAX_TOKENS
      ? parseInt(process.env.DEFAULT_MAX_TOKENS, 10)
      : undefined;

    // Initialize providers with API keys
    if (openaiKey) {
      this.openaiProvider = new OpenAIProvider(openaiKey, {
        defaultModel,
        defaultTemperature,
        defaultMaxTokens,
      });
    }

    if (anthropicKey) {
      this.anthropicProvider = new AnthropicProvider(anthropicKey, {
        defaultModel,
        defaultTemperature,
        defaultMaxTokens,
      });
    }

    if (geminiKey) {
      this.geminiProvider = new GeminiProvider(geminiKey, {
        defaultModel,
      });
    }

    // Set the active provider
    this.provider = defaultProvider;
    this.validateProvider();
  }

  /**
   * Set the active AI provider
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
    this.validateProvider();
  }

  /**
   * Get the current active provider
   */
  getProvider(): AIProvider {
    return this.provider;
  }

  /**
   * Validate that the current provider is available
   */
  private validateProvider(): void {
    const providerInstance = this.getProviderInstance();

    if (!providerInstance) {
      throw new Error(
        `Provider '${this.provider}' is not configured. ` +
        `Please set the appropriate API key in environment variables.`
      );
    }
  }

  /**
   * Get the instance of the current provider
   */
  private getProviderInstance() {
    switch (this.provider) {
      case 'openai':
        return this.openaiProvider;
      case 'anthropic':
        return this.anthropicProvider;
      case 'gemini':
        return this.geminiProvider;
      default:
        return null;
    }
  }

  /**
   * Complete a prompt with the current AI provider
   */
  async complete(messages: AIMessage[], options?: AICompleteOptions): Promise<AICompleteResponse> {
    const providerInstance = this.getProviderInstance();

    if (!providerInstance) {
      throw new Error(`Provider '${this.provider}' is not configured.`);
    }

    return providerInstance.complete(messages, options);
  }

  /**
   * Stream a completion from the current AI provider
   */
  async stream(
    messages: AIMessage[],
    callback: AIStreamCallback,
    options?: AIStreamOptions
  ): Promise<AICompleteResponse> {
    const providerInstance = this.getProviderInstance();

    if (!providerInstance) {
      throw new Error(`Provider '${this.provider}' is not configured.`);
    }

    return providerInstance.stream(messages, callback, options);
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(provider: AIProvider): boolean {
    switch (provider) {
      case 'openai':
        return this.openaiProvider !== null;
      case 'anthropic':
        return this.anthropicProvider !== null;
      case 'gemini':
        return this.geminiProvider !== null;
      default:
        return false;
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];
    if (this.openaiProvider) providers.push('openai');
    if (this.anthropicProvider) providers.push('anthropic');
    if (this.geminiProvider) providers.push('gemini');
    return providers;
  }
}

// Export a singleton instance
export const aiService = new AIService();

// Re-export types
export * from './types';
export { OpenAIProvider } from './providers/openai.provider';
export { AnthropicProvider } from './providers/anthropic.provider';
export { GeminiProvider } from './providers/gemini.provider';
