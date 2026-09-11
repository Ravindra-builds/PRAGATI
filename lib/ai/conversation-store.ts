/**
 * In-Memory Conversation & Audit Store for PRAGATI Assistant.
 *
 * Keeps minimal session context and audit logs for user interactions
 * without storing secrets or API credentials.
 */

import { AssistantResponse, ChatMessage } from './types'

export interface StoredInteraction {
  id: string
  conversationId: string
  projectId?: string
  userMessage: string
  assistantResponse: AssistantResponse
  createdAt: string
}

export interface ConversationSession {
  id: string
  projectId?: string
  messages: ChatMessage[]
  lastActive: string
  createdAt: string
}

class ConversationStore {
  private sessions = new Map<string, ConversationSession>()
  private auditLogs: StoredInteraction[] = []
  private readonly MAX_SESSIONS = 500
  private readonly MAX_MESSAGES_PER_SESSION = 20

  getOrCreateSession(conversationId?: string, initialProjectId?: string): ConversationSession {
    const id = conversationId && conversationId.trim() ? conversationId : `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    let session = this.sessions.get(id)
    if (!session) {
      if (this.sessions.size >= this.MAX_SESSIONS) {
        // Evict oldest session
        const firstKey = this.sessions.keys().next().value
        if (firstKey) this.sessions.delete(firstKey)
      }

      session = {
        id,
        projectId: initialProjectId,
        messages: [],
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
      this.sessions.set(id, session)
    } else if (initialProjectId) {
      session.projectId = initialProjectId
    }

    return session
  }

  addMessage(conversationId: string, message: ChatMessage) {
    const session = this.sessions.get(conversationId)
    if (session) {
      session.messages.push(message)
      if (session.messages.length > this.MAX_MESSAGES_PER_SESSION) {
        session.messages = session.messages.slice(-this.MAX_MESSAGES_PER_SESSION)
      }
      session.lastActive = new Date().toISOString()
    }
  }

  recordAudit(conversationId: string, userMessage: string, response: AssistantResponse, projectId?: string) {
    const interaction: StoredInteraction = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId,
      projectId,
      userMessage,
      assistantResponse: response,
      createdAt: new Date().toISOString(),
    }

    this.auditLogs.push(interaction)
    if (this.auditLogs.length > 1000) {
      this.auditLogs.shift()
    }
  }

  getAuditLogs(limit = 50): StoredInteraction[] {
    return this.auditLogs.slice(-limit)
  }
}

export const conversationStore = new ConversationStore()
