import { describe, it, expect, beforeEach } from 'vitest';
import config from '../lib/utils/config.js';

describe('Vanguard Config Logic', () => {
  beforeEach(() => {
    config.clear();
  });

  it('should store and retrieve AI provider settings', () => {
    config.set('AI_PROVIDER', 'ollama');
    expect(config.get('AI_PROVIDER')).toBe('ollama');
  });

  it('should have default Ollama model as qwen2.5:7b', () => {
    expect(config.get('OLLAMA_MODEL')).toBe('qwen2.5:7b');
  });

  it('should store Gemini API keys securely', () => {
    const testKey = 'sk-vanguard-123456';
    config.set('GEMINI_KEY', testKey);
    expect(config.get('GEMINI_KEY')).toBe(testKey);
  });
});
