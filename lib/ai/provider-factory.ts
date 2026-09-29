/**
 * LLM Provider Factory for PRAGATI Assistant.
 */

import { LLMProvider } from './providers/provider-interface'
import { MockGroundedProvider } from './providers/mock-grounded-provider'
import { GeminiProvider } from './providers/gemini-provider'
import { OpenAIProvider } from './providers/openai-provider'

export class ProviderFactory {
  static getProvider(override?: string): LLMProvider {
    const explicitOverride = (override || '').toLowerCase().trim()
    if (explicitOverride === 'mock') {
      return new MockGroundedProvider()
    }

    const providerName = (explicitOverride || process.env.LLM_PROVIDER || '').toLowerCase().trim()
    const hasGeminiKey = Boolean((process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim())
    const hasOpenAIKey = Boolean((process.env.OPENAI_API_KEY || '').trim())

    if (providerName === 'gemini' || hasGeminiKey) {
      return new GeminiProvider()
    }

    if (providerName === 'openai' || hasOpenAIKey) {
      return new OpenAIProvider()
    }

    // Default to deterministic grounded offline mock provider when no API keys are present
    return new MockGroundedProvider()
  }
}
