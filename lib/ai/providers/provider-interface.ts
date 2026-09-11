/**
 * LLM Provider Interface for PRAGATI Assistant.
 */

import { AssistantResponse, ChatMessage, GroundedContext } from '../types'

export interface LLMProvider {
  readonly name: string

  /**
   * Generates a grounded assistant response given user prompt, system prompt, and context.
   */
  generateResponse(
    prompt: string,
    systemPrompt: string,
    context: GroundedContext,
    history?: ChatMessage[]
  ): Promise<AssistantResponse>
}
