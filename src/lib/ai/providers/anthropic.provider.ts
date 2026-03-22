/**
 * Anthropic/Claude Provider Implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProviderInterface,
  AIMessage,
  AICompleteOptions,
  AIStreamOptions,
  AICompleteResponse,
  AIStreamCallback,
  AIProvider,
} from '../types';

export class AnthropicProvider implements AIProviderInterface {
  private client: Anthropic;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(apiKey: string, options?: {
    baseURL?: string;
    defaultModel?: string;
    defaultTemperature?: number;
    defaultMaxTokens?: number;
  }) {
    this.client = new Anthropic({
      apiKey,
      baseURL: options?.baseURL,
      dangerouslyAllowBrowser: process.env.NODE_ENV === 'test',
    });
    this.defaultModel = options?.defaultModel || 'claude-3-5-sonnet-20241022';
    this.defaultTemperature = options?.defaultTemperature ?? 0.7;
    this.defaultMaxTokens = options?.defaultMaxTokens ?? 2000;
  }

  getProvider(): AIProvider {
    return 'anthropic';
  }

  async complete(
    messages: AIMessage[],
    options?: AICompleteOptions
  ): Promise<AICompleteResponse> {
    // Convert messages to Anthropic format
    // Note: Anthropic requires system message to be separate
    let systemMessage = '';
    const chatMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        chatMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    const response = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      messages: chatMessages,
      system: systemMessage || undefined,
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      top_p: options?.topP,
    });

    // Get text content from response
    const contentBlock = response.content[0];
    if (contentBlock.type !== 'text') {
      throw new Error('Anthropic returned non-text response');
    }

    return {
      content: contentBlock.text,
      model: response.model,
      usage: response.usage ? {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      } : undefined,
    };
  }

  async stream(
    messages: AIMessage[],
    callback: AIStreamCallback,
    options?: AIStreamOptions
  ): Promise<AICompleteResponse> {
    // Convert messages to Anthropic format
    let systemMessage = '';
    const chatMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        chatMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    const stream = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      messages: chatMessages,
      system: systemMessage || undefined,
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      top_p: options?.topP,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const content = chunk.delta.text;
        fullContent += content;
        callback(content);
      }
    }

    return {
      content: fullContent,
      model: options?.model || this.defaultModel,
    };
  }
}
