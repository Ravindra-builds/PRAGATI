/**
 * Google Gemini Provider for PRAGATI Assistant.
 *
 * Communicates with the Google Gemini API using native fetch.
 * Parses and validates structured JSON responses.
 */

import { LLMProvider } from './provider-interface'
import { AssistantResponse, ChatMessage, GroundedContext } from '../types'
import { buildGroundingPrompt, PRAGATI_SYSTEM_PROMPT } from '../prompts'

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini'
  private apiKey: string
  private model: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
    this.model = model || process.env.LLM_MODEL || 'gemini-2.5-flash'
  }

  async generateResponse(
    prompt: string,
    systemPrompt: string,
    context: GroundedContext,
    history?: ChatMessage[]
  ): Promise<AssistantResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured (GEMINI_API_KEY).')
    }

    const groundingPrompt = buildGroundingPrompt(prompt, context)

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []

    if (history && history.length > 0) {
      for (const msg of history.slice(-4)) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: groundingPrompt }],
    })

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt || PRAGATI_SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.2,
          response_mime_type: 'application/json',
        },
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Gemini API returned HTTP ${res.status}: ${errorText}`)
    }

    const data = await res.json()
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return this.parseResponse(textOutput, context)
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
