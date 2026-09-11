'use client'

import React, { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Send,
  Bot,
  User,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Layers,
  Building2,
  TrendingUp,
  Clock,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react'
import { AssistantResponse } from '@/lib/ai/types'

interface UIConversationItem {
  id: string
  role: 'user' | 'assistant'
  content?: string
  response?: AssistantResponse
  timestamp: string
}

let globalMessageCounter = 0
function getNextMessageId(prefix: string) {
  globalMessageCounter += 1
  return `${prefix}_${globalMessageCounter}`
}

function AssistantContent() {
  const searchParams = useSearchParams()
  const initialProjectId = searchParams.get('projectId') || ''

  const [activeProjectId, setActiveProjectId] = useState<string>(initialProjectId)
  const [prevInitialProjectId, setPrevInitialProjectId] = useState<string>(initialProjectId)

  // Render-time state synchronization
  if (initialProjectId !== prevInitialProjectId) {
    setPrevInitialProjectId(initialProjectId)
    setActiveProjectId(initialProjectId)
  }

  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string>('')
  const [messages, setMessages] = useState<UIConversationItem[]>([])
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Context-aware starter suggestions
  const starterPrompts = activeProjectId
    ? [
        `Why is ${activeProjectId} considered high risk?`,
        `What are the main warning signals for ${activeProjectId}?`,
        `What is driving schedule risk for ${activeProjectId}?`,
        `What should the monitoring team review for this project?`,
      ]
    : [
        'Which projects need the most attention?',
        'Which sectors have the highest predicted risk?',
        'Show projects where financial progress is substantially ahead of physical progress.',
        'What are the strongest portfolio-level warning patterns?',
        'Compare PRJ-0016 and PRJ-0004.',
      ]

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputMessage).trim()
    if (!message || loading) return

    const userItemId = getNextMessageId('msg')
    const newMessages: UIConversationItem[] = [
      ...messages,
      {
        id: userItemId,
        role: 'user',
        content: message,
        timestamp: 'Just now',
      },
    ]

    setMessages(newMessages)
    setInputMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          projectId: activeProjectId || undefined,
          conversationId: conversationId || undefined,
          history: newMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content || m.response?.answer || '',
          })),
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

      // If response pertains to a specific project, update context pill if not set
      if (assistantResponse.projectId && !activeProjectId) {
        setActiveProjectId(assistantResponse.projectId)
      }

      setMessages((prev) => [
        ...prev,
        {
          id: getNextMessageId('asst'),
          role: 'assistant',
          response: assistantResponse,
          timestamp: 'Just now',
        },
      ])
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error communicating with intelligence assistant'
      setMessages((prev) => [
        ...prev,
        {
          id: getNextMessageId('err'),
          role: 'assistant',
          response: {
            answer: `Sorry, I encountered an error: ${errorMsg}`,
            evidence: ['System connection failure.'],
            model_signals: ['Please ensure FastAPI ML service and backend are reachable.'],
            recommendations: ['Retry your question or inspect network connectivity.'],
            limitations: ['Operational network error.'],
          },
          timestamp: 'Just now',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearSession = () => {
    setMessages([])
    setConversationId('')
    setActiveProjectId('')
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-5.25rem)] max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5 text-blue-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                PRAGATI Project Intelligence
              </h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 tracking-wider">
                Grounded LLM
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Grounded AI assistant for infrastructure project monitoring, model risk drivers, and portfolio review.
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Context Scope Indicator */}
      <div className="shrink-0 my-2.5 flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Active Scope:</span>
          {activeProjectId ? (
            <div className="inline-flex items-center gap-1.5 bg-blue-100/70 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-md font-medium">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-mono font-bold">{activeProjectId}</span>
              <Link
                href={`/dashboard/projects/${activeProjectId}`}
                className="ml-1 text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-0.5 text-[11px]"
              >
                <span>View Dossier</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-md font-medium">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full Portfolio Scope (850 Projects)</span>
            </div>
          )}
        </div>

        {activeProjectId && (
          <button
            type="button"
            onClick={() => setActiveProjectId('')}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            Switch to Portfolio Scope
          </button>
        )}
      </div>

      {/* Chat History Area (Internally Scrollable) */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-4">
        {messages.length === 0 ? (
          /* Empty state with starter prompts */
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 text-center space-y-6 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 mx-auto flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h2 className="text-sm font-bold text-slate-900">
                How can PRAGATI Intelligence assist your monitoring today?
              </h2>
              <p className="text-xs text-slate-500">
                Ask specific questions regarding project slippage, dual-target model drivers, or portfolio-scale warning patterns.
              </p>
            </div>

            {/* Suggested Prompts */}
            <div className="space-y-2 max-w-xl mx-auto text-left">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                Suggested Questions
              </span>
              <div className="flex flex-col gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 text-xs text-slate-700 hover:text-blue-900 font-medium transition-colors flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>

            {/* Trust Banner */}
            <div className="max-w-md mx-auto text-[11px] text-slate-400 border-t border-slate-100 pt-4 flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Responses are strictly grounded in PostgreSQL records and dual-target ML inference.</span>
            </div>
          </div>
        ) : (
          messages.map((item) => (
            <div
              key={item.id}
              className={`flex gap-3 ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {item.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Bot className="w-4 h-4 text-blue-100" />
                </div>
              )}

              <div
                className={`max-w-3xl space-y-3 ${
                  item.role === 'user'
                    ? 'bg-slate-900 text-white px-4 py-3 rounded-2xl rounded-tr-xs text-xs font-medium'
                    : 'w-full'
                }`}
              >
                {item.role === 'user' ? (
                  <div>{item.content}</div>
                ) : item.response ? (
                  /* Grounded Structured Assistant Card */
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                    {/* Executive Answer */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                          Intelligence Summary
                        </span>
                        <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-900 font-medium leading-relaxed">
                        {item.response.answer}
                      </p>
                    </div>

                    {/* Telemetry Evidence */}
                    {item.response.evidence && item.response.evidence.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Observed Telemetry &amp; Evidence</span>
                        </div>
                        <ul className="space-y-1 text-xs text-slate-600">
                          {item.response.evidence.map((ev, i) => (
                            <li key={`ev-${i}`} className="flex items-start gap-2">
                              <span className="text-blue-500 font-bold shrink-0">&bull;</span>
                              <span>{ev}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Model-Supported Risk Signals */}
                    {item.response.model_signals && item.response.model_signals.length > 0 && (
                      <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-200/60 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                          <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
                          <span>Model-Supported Risk Signals (ML Inference)</span>
                        </div>
                        <ul className="space-y-1 text-xs text-amber-900">
                          {item.response.model_signals.map((sig, i) => (
                            <li key={`sig-${i}`} className="flex items-start gap-2">
                              <span className="text-amber-600 font-bold shrink-0">&bull;</span>
                              <span>{sig}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Review Actions */}
                    {item.response.recommendations && item.response.recommendations.length > 0 && (
                      <div className="bg-blue-50/40 rounded-lg p-3 border border-blue-200/70 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900 uppercase tracking-wide">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                          <span>Recommended Review Actions (Advisory)</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700 font-medium">
                          {item.response.recommendations.map((rec, i) => (
                            <li key={`rec-${i}`} className="leading-snug">
                              <span className="text-slate-800">{rec}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Limitations & Transparency */}
                    {item.response.limitations && item.response.limitations.length > 0 && (
                      <div className="border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          {item.response.limitations.map((lim, i) => (
                            <p key={`lim-${i}`}>{lim}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {item.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Typing / Loading Indicator */}
        {loading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Bot className="w-4 h-4 text-blue-100 animate-pulse" />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs text-xs text-slate-500 font-medium flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Retrieving telemetry and synthesizing grounded intelligence...</span>
            </div>
          </div>
        )}

        <div className="h-2" />
      </div>

      {/* Chat Input Bar */}
      <div className="shrink-0 pt-2 pb-1">
        <div className="bg-white rounded-2xl border border-slate-300 p-2.5 shadow-md space-y-2">
        <div className="relative flex items-end gap-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeProjectId
                ? `Ask about ${activeProjectId}'s risk drivers, telemetry, or review recommendations...`
                : 'Ask a project or portfolio question (e.g. Why is PRJ-0016 high risk?)...'
            }
            rows={2}
            className="w-full resize-none px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-hidden font-medium"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || loading}
            className="p-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs shrink-0"
            aria-label="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

          <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
            <span>Press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Enter</kbd> to send</span>
            <span>SIH 2026 PRAGATI Prototype</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-xs text-slate-400 font-medium animate-pulse">
          Loading PRAGATI Intelligence Assistant...
        </div>
      }
    >
      <AssistantContent />
    </Suspense>
  )
}
