/**
 * API Route: POST /api/assistant/chat
 *
 * Dedicated server-side endpoint for PRAGATI Project Intelligence.
 * Receives user question, extracts entities, retrieves minimal grounded
 * application context, and invokes the configured LLM provider.
 */

import { NextRequest, NextResponse } from 'next/server'
import { AssistantChatRequestSchema } from '@/lib/ai/types'
import { ContextBuilder } from '@/lib/ai/context-builder'
import { ProviderFactory } from '@/lib/ai/provider-factory'
import { PRAGATI_SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { conversationStore } from '@/lib/ai/conversation-store'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json()
    const parsed = AssistantChatRequestSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid assistant chat request parameters',
          details: parsed.error.format(),
        },
        { status: 400 }
      )
    }

    const { message, projectId, conversationId, history } = parsed.data

    // 1. Manage session memory
    const session = conversationStore.getOrCreateSession(conversationId, projectId)

    // 2. Build structured grounded context from database/telemetry/ML outputs
    const groundedContext = await ContextBuilder.buildContext(message, session.projectId || projectId)

    // 3. Obtain configured LLM provider
    const provider = ProviderFactory.getProvider()

    // 4. Generate structured grounded response (with fallback to MockGroundedProvider on external API failure)
    let assistantResponse
    try {
      assistantResponse = await provider.generateResponse(
        message,
        PRAGATI_SYSTEM_PROMPT,
        groundedContext,
        history || session.messages
      )
    } catch (llmError) {
      console.warn(`Provider [${provider.name}] encountered an error. Falling back to MockGroundedProvider:`, llmError)
      const fallbackProvider = ProviderFactory.getProvider('mock')
      assistantResponse = await fallbackProvider.generateResponse(
        message,
        PRAGATI_SYSTEM_PROMPT,
        groundedContext,
        history || session.messages
      )
    }

    // 5. Update session and audit trail
    conversationStore.addMessage(session.id, { role: 'user', content: message })
    conversationStore.addMessage(session.id, { role: 'assistant', content: assistantResponse.answer })
    conversationStore.recordAudit(session.id, message, assistantResponse, assistantResponse.projectId || projectId)

    return NextResponse.json({
      success: true,
      data: assistantResponse,
      conversationId: session.id,
      contextType: groundedContext.type,
    })
  } catch (error: unknown) {
    const err = error as Error
    console.error('PRAGATI Assistant Error:', err)

    return NextResponse.json(
      {
        error: 'Assistant Error',
        message: err.message || 'An error occurred while processing intelligence query',
      },
      { status: 500 }
    )
  }
}
