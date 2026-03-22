/**
 * OpenAI Provider Implementation
 */

import OpenAI from 'openai';
import type {
  AIProviderInterface,
  AIMessage,
  AICompleteOptions,
  AIStreamOptions,
  AICompleteResponse,
  AIStreamCallback,
  AIProvider,
} from '../types';

export class OpenAIProvider implements AIProviderInterface {
  private client: OpenAI;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(apiKey: string, options?: {
    baseURL?: string;
    defaultModel?: string;
    defaultTemperature?: number;
    defaultMaxTokens?: number;
  }) {
    this.client = new OpenAI({
      apiKey,
      baseURL: options?.baseURL,
      dangerouslyAllowBrowser: process.env.NODE_ENV === 'test',
    });
    this.defaultModel = options?.defaultModel || 'gpt-4o-mini';
    this.defaultTemperature = options?.defaultTemperature ?? 0.7;
    this.defaultMaxTokens = options?.defaultMaxTokens ?? 2000;
  }

  getProvider(): AIProvider {
    return 'openai';
  }

  async complete(
    messages: AIMessage[],
    options?: AICompleteOptions
  ): Promise<AICompleteResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      top_p: options?.topP,
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error('OpenAI returned empty response');
    }

    return {
      content: choice.message.content,
      model: response.model,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  async stream(
    messages: AIMessage[],
    callback: AIStreamCallback,
    options?: AIStreamOptions
  ): Promise<AICompleteResponse> {
    const stream = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      top_p: options?.topP,
      stream: true,
    });

    let fullContent = '';
    let model = options?.model || this.defaultModel;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullContent += content;
        callback(content);
      }
      if (chunk.model) {
        model = chunk.model;
      }
    }

    return {
      content: fullContent,
      model,
    };
  }
}
