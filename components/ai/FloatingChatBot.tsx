'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot,
  User,
  Send,
  X,
  Maximize2,
  RotateCcw,
  Clock,
  TrendingUp,
  CheckCircle2,
  Info,
  Building2,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { AssistantResponse } from '@/lib/ai/types'

interface FloatingMessage {
  id: string
  role: 'user' | 'assistant'
  content?: string
  response?: AssistantResponse
  timestamp: string
}

let floatingMessageCounter = 0
function getNextFloatingId(prefix: string) {
  floatingMessageCounter += 1
  return `${prefix}_floating_${floatingMessageCounter}`
}

export function FloatingChatBot() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string>('')
  const [messages, setMessages] = useState<FloatingMessage[]>([])
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Hide the floating trigger on the dedicated assistant page
  const isDedicatedAssistantPage = pathname?.startsWith('/dashboard/assistant')

  // Detect project ID if browsing a specific project dossier
  const projectMatch = pathname?.match(/\/dashboard\/projects\/(PRJ-[0-9A-Za-z]+)/i)
  const detectedProjectId = projectMatch ? projectMatch[1].toUpperCase() : undefined

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      })
    }
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, loading, isOpen])

  if (isDedicatedAssistantPage) {
    return null
  }

  const starterChips = detectedProjectId
    ? [
        `What are the critical risk drivers for ${detectedProjectId}?`,
        `Summarize delivery milestones and delays for ${detectedProjectId}`,
        `What are the active early warnings for ${detectedProjectId}?`,
      ]
    : [
        'Which Railway projects face critical cost overrun risks?',
        'Show projects where financial expenditure outpaces physical delivery',
        'Summarize high-risk infrastructure projects across states',
      ]

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || loading) return

    const userMessage: FloatingMessage = {
      id: getNextFloatingId('user'),
      role: 'user',
      content: text,
      timestamp: 'Just now',
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          activeProjectId: detectedProjectId,
          conversationId: conversationId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to get intelligence response')
      }

      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      const assistantResponse: AssistantResponse = data.data

      setMessages((prev) => [
        ...prev,
        {
          id: getNextFloatingId('asst'),
          role: 'assistant',
          response: assistantResponse,
          timestamp: 'Just now',
        },
      ])
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Error communicating with PRAGATI AI'
      setMessages((prev) => [
        ...prev,
        {
          id: getNextFloatingId('err'),
          role: 'assistant',
          response: {
            answer: `I encountered an issue: ${errorMsg}. Please try asking again.`,
            evidence: ['Service connection status check.'],
            model_signals: ['Ensure ML service and backend APIs are running.'],
            recommendations: ['Retry your question or rephrase.'],
            limitations: ['Network or service error.'],
          },
          timestamp: 'Just now',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleResetChat = () => {
    setMessages([])
    setConversationId('')
  }

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer group border border-blue-600/50 hover:scale-105"
          aria-label="Open PRAGATI AI Assistant"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-100 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-blue-700 animate-pulse" />
          </div>
          <span className="text-xs font-bold tracking-wide hidden sm:inline">
            PRAGATI AI
          </span>
        </button>
      )}

      {/* Floating Chat Modal / Window */}
      {isOpen && (
        <div className="fixed bottom-5 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[430px] h-[540px] max-h-[84vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="shrink-0 bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4 text-blue-100" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold tracking-tight">PRAGATI AI</h3>
                  <span className="text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded bg-blue-900 text-blue-200 border border-blue-700">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                  Predictive Monitoring Intelligence
                </p>
              </div>
            </div>

            {/* Window controls */}
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Reset conversation"
                  className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <Link
                href={
                  detectedProjectId
                    ? `/dashboard/assistant?projectId=${detectedProjectId}`
                    : '/dashboard/assistant'
                }
                title="Open in full screen workspace"
                className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Context Scope Strip */}
          <div className="shrink-0 px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600">
              {detectedProjectId ? (
                <>
                  <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>
                    Scoped to project:{' '}
                    <strong className="font-mono text-blue-800 font-bold">
                      {detectedProjectId}
                    </strong>
                  </span>
                </>
              ) : (
                <>
                  <Layers className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="text-slate-700 font-medium">
                    Portfolio Scope (850 Projects)
                  </span>
                </>
              )}
            </div>
            <Link
              href="/dashboard/assistant"
              className="text-[10px] text-blue-700 hover:underline font-semibold"
            >
              Full Workspace &rarr;
            </Link>
          </div>

          {/* Messages Stream Container (Scrolls Internally) */}
          <div
            ref={messagesContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50"
          >
            {messages.length === 0 ? (
              <div className="py-4 px-2 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 mx-auto flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900">
                    How can PRAGATI AI assist you?
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Ask about project status, cost/schedule overrun risks, SHAP drivers, or what PRAGATI means.
                  </p>
                </div>

                {/* Starter chips */}
                <div className="flex flex-col gap-1.5 pt-2 text-left">
                  {starterChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSendMessage(chip)}
                      className="text-left text-[11px] p-2 rounded-lg bg-white hover:bg-blue-50/60 border border-slate-200 text-slate-700 hover:text-blue-900 font-medium transition-colors flex items-center justify-between group cursor-pointer shadow-2xs"
                    >
                      <span>{chip}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1.5" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-md bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-blue-100" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] text-xs ${
                      m.role === 'user'
                        ? 'bg-slate-900 text-white px-3 py-2 rounded-2xl rounded-tr-xs font-medium'
                        : 'w-full'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <div>{m.content}</div>
                    ) : m.response ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2.5">
                        {/* Executive Summary */}
                        <p className="text-xs text-slate-900 font-medium leading-relaxed">
                          {m.response.answer}
                        </p>

                        {/* Telemetry Evidence */}
                        {m.response.evidence && m.response.evidence.length > 0 && (
                          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 space-y-1">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>Observed Telemetry</span>
                            </div>
                            <ul className="space-y-0.5 text-[11px] text-slate-600">
                              {m.response.evidence.slice(0, 3).map((ev, i) => (
                                <li key={`fev-${i}`} className="flex items-start gap-1.5">
                                  <span className="text-blue-500 font-bold shrink-0">&bull;</span>
                                  <span>{ev}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Model-Supported Risk Signals */}
                        {m.response.model_signals && m.response.model_signals.length > 0 && (
                          <div className="bg-amber-50/60 rounded-lg p-2 border border-amber-200/60 space-y-1">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900 uppercase tracking-wide">
                              <TrendingUp className="w-3 h-3 text-amber-700" />
                              <span>ML Risk Signals</span>
                            </div>
                            <ul className="space-y-0.5 text-[11px] text-amber-900">
                              {m.response.model_signals.slice(0, 2).map((sig, i) => (
                                <li key={`fsig-${i}`} className="flex items-start gap-1.5">
                                  <span className="text-amber-600 font-bold shrink-0">&bull;</span>
                                  <span>{sig}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Advisory Review Actions */}
                        {m.response.recommendations && m.response.recommendations.length > 0 && (
                          <div className="bg-blue-50/40 rounded-lg p-2 border border-blue-200/60 space-y-1">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-900 uppercase tracking-wide">
                              <CheckCircle2 className="w-3 h-3 text-blue-700" />
                              <span>Recommended Review Actions</span>
                            </div>
                            <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-700 font-medium">
                              {m.response.recommendations.slice(0, 2).map((rec, i) => (
                                <li key={`frec-${i}`} className="leading-snug">
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Limitations note */}
                        {m.response.limitations && m.response.limitations.length > 0 && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-100">
                            <Info className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{m.response.limitations[0]}</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {m.role === 'user' && (
                    <div className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Loading animation */}
            {loading && (
              <div className="flex gap-2 items-center text-xs text-slate-500 bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs w-fit">
                <Bot className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span className="text-[11px] font-medium">PRAGATI AI is synthesizing...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="shrink-0 p-2.5 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  detectedProjectId
                    ? `Ask about ${detectedProjectId}...`
                    : 'Ask a question or what PRAGATI means...'
                }
                className="flex-1 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || loading}
                className="p-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0 shadow-xs"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between px-1 pt-1 text-[10px] text-slate-400">
              <span>Press Enter to send</span>
              <span>Grounded ML Model Intelligence</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
