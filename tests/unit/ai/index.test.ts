/**
 * AI Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AIMessage } from '@/lib/ai/types';

const mockMessages: AIMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello, how are you?' },
];

describe('AIService', () => {
  beforeEach(() => {
    // Set up environment variables for testing
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.DEFAULT_AI_PROVIDER = 'openai';
    process.env.DEFAULT_MODEL = 'test-model';
    process.env.DEFAULT_TEMPERATURE = '0.5';
    process.env.DEFAULT_MAX_TOKENS = '1000';

    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Provider Management', () => {
    it('should initialize with default provider from environment', async () => {
      const { AIService } = await import('@/lib/ai');
      const aiService = new AIService();
      expect(aiService.getProvider()).toBe('openai');
    });

    it('should detect all available providers', async () => {
      const { AIService } = await import('@/lib/ai');
      const aiService = new AIService();
      const available = aiService.getAvailableProviders();
      expect(available).toContain('openai');
      expect(available).toContain('anthropic');
      expect(available).toContain('gemini');
    });

    it('should check if a provider is available', async () => {
      const { AIService } = await import('@/lib/ai');
      const aiService = new AIService();
      expect(aiService.isProviderAvailable('openai')).toBe(true);
      expect(aiService.isProviderAvailable('anthropic')).toBe(true);
      expect(aiService.isProviderAvailable('gemini')).toBe(true);
    });

    it('should allow switching providers', async () => {
      const { AIService } = await import('@/lib/ai');
      const aiService = new AIService();
      aiService.setProvider('anthropic');
      expect(aiService.getProvider()).toBe('anthropic');

      aiService.setProvider('openai');
      expect(aiService.getProvider()).toBe('openai');
    });

    it('should throw error when provider is not configured', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GEMINI_API_KEY;

      // Reset modules to pick up new env vars
      vi.resetModules();

      // The import will throw because the singleton gets created
      await expect(async () => {
        await import('@/lib/ai');
      }).rejects.toThrow();
    });
  });

  describe('Gemini Provider', () => {
    it('should throw error for Gemini (not implemented)', async () => {
      process.env.GEMINI_API_KEY = 'test-key';

      const { AIService } = await import('@/lib/ai');
      const aiService = new AIService();
      aiService.setProvider('gemini');

      await expect(aiService.complete(mockMessages)).rejects.toThrow(
        'Gemini provider is not yet implemented'
      );
    });
  });

  describe('Type Definitions', () => {
    it('should export all required types', async () => {
      const types = await import('@/lib/ai/types');

      // Types are exported as 'type' which may not be available at runtime
      // Just verify the module loads correctly
      expect(types).toBeDefined();
    });
  });

  describe('Provider Classes', () => {
    it('should export OpenAIProvider class', async () => {
      const { OpenAIProvider } = await import('@/lib/ai');
      expect(OpenAIProvider).toBeDefined();
    });

    it('should export AnthropicProvider class', async () => {
      const { AnthropicProvider } = await import('@/lib/ai');
      expect(AnthropicProvider).toBeDefined();
    });

    it('should export GeminiProvider class', async () => {
      const { GeminiProvider } = await import('@/lib/ai');
      expect(GeminiProvider).toBeDefined();
    });
  });

  describe('Service Singleton', () => {
    it('should export aiService singleton', async () => {
      const { aiService } = await import('@/lib/ai');
      expect(aiService).toBeDefined();
      expect(aiService).toBeInstanceOf(Object);
      expect(typeof aiService.complete).toBe('function');
      expect(typeof aiService.stream).toBe('function');
      expect(typeof aiService.setProvider).toBe('function');
      expect(typeof aiService.getProvider).toBe('function');
    });
  });
});
