/**
 * LLM Provider Factory for PRAGATI Assistant.
 */

import { LLMProvider } from './providers/provider-interface'
import { MockGroundedProvider } from './providers/mock-grounded-provider'
import { GeminiProvider } from './providers/gemini-provider'
import { OpenAIProvider } from './providers/openai-provider'

export class ProviderFactory {
  private static cachedProvider: LLMProvider | null = null

  static getProvider(override?: string): LLMProvider {
    const providerName = (override || process.env.LLM_PROVIDER || '').toLowerCase().trim()

    if (providerName === 'gemini' || (!providerName && process.env.GEMINI_API_KEY)) {
      return new GeminiProvider()
    }

    if (providerName === 'openai' || (!providerName && process.env.OPENAI_API_KEY)) {
      return new OpenAIProvider()
    }

    // Default to deterministic grounded offline mock provider
    return new MockGroundedProvider()
  }
}
