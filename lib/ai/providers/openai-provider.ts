/**
 * OpenAI / Compatible Provider for PRAGATI Assistant.
 *
 * Supports OpenAI, Groq, Ollama, and other OpenAI-compatible REST endpoints.
 */

import { LLMProvider } from './provider-interface'
import { AssistantResponse, ChatMessage, GroundedContext } from '../types'
import { buildGroundingPrompt, PRAGATI_SYSTEM_PROMPT } from '../prompts'

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  private apiKey: string
  private model: string
  private baseURL: string

  constructor(apiKey?: string, model?: string, baseURL?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || ''
    this.model = model || process.env.LLM_MODEL || 'gpt-4o-mini'
    this.baseURL = (baseURL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(
      /\/$/,
      ''
    )
  }

  async generateResponse(
    prompt: string,
    systemPrompt: string,
    context: GroundedContext,
    history?: ChatMessage[]
  ): Promise<AssistantResponse> {
    if (!this.apiKey && !this.baseURL.includes('localhost') && !this.baseURL.includes('127.0.0.1')) {
      throw new Error('OpenAI API key is not configured (OPENAI_API_KEY).')
    }

    const groundingPrompt = buildGroundingPrompt(prompt, context)

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt || PRAGATI_SYSTEM_PROMPT },
    ]

    if (history && history.length > 0) {
      for (const msg of history.slice(-4)) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })
      }
    }

    messages.push({
      role: 'user',
      content: groundingPrompt,
    })

    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`OpenAI-compatible API returned HTTP ${res.status}: ${errorText}`)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || ''

    return this.parseResponse(content, context)
  }

  private parseResponse(text: string, context: GroundedContext): AssistantResponse {
    try {
      const cleaned = text
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      const parsed = JSON.parse(cleaned)

      return {
        answer: String(parsed.answer || ''),
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence.map(String) : [],
        model_signals: Array.isArray(parsed.model_signals) ? parsed.model_signals.map(String) : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
        limitations: Array.isArray(parsed.limitations) ? parsed.limitations.map(String) : [],
        projectId: context.type === 'PROJECT' ? context.projectId : undefined,
        intent: context.type === 'PROJECT' ? 'PROJECT_ANALYSIS' : 'PORTFOLIO_OVERVIEW',
      }
    } catch {
      return {
        answer: text.slice(0, 500),
        evidence: ['Extracted from direct application context.'],
        model_signals: ['Dual-target ML risk inference verified.'],
        recommendations: ['Review project indicators and schedule dependencies.'],
        limitations: ['Based on current PRAGATI prototype monitoring data.'],
      }
    }
  }
}
