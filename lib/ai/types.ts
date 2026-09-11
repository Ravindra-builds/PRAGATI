/**
 * Type definitions and Zod validation schemas for the PRAGATI Project Intelligence Assistant.
 */

import { z } from 'zod'

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  role: ChatRole
  content: string
  timestamp?: string
}

export interface RiskDriverItem {
  feature: string
  display_name: string
  value?: string | number | null
  contribution: number
  direction: 'increases_risk' | 'decreases_risk' | 'neutral'
}

export interface GroundedProjectContext {
  project_id: string
  name: string
  sector: string
  ministry: string
  state: string
  implementing_agency: string
  original_cost_cr: number
  planned_duration_months: number
  status: string
  latest_update?: {
    snapshot_month: string
    physical_progress_pct: number
    financial_progress_pct: number
    expenditure_cr: number
    elapsed_months: number
    milestones_total: number
    milestones_delayed: number
    burn_gap: number
    schedule_elapsed_ratio: number
  } | null
  recent_history?: Array<{
    snapshot_month: string
    physical_progress_pct: number
    financial_progress_pct: number
    milestones_delayed: number
  }>
  predictions?: {
    cost_overrun_probability: number
    cost_prediction: number
    time_overrun_probability: number
    time_prediction: number
    overall_risk_level: string
    cost_model_version?: string
    time_model_version?: string
  } | null
  risk_drivers?: {
    cost: RiskDriverItem[]
    time: RiskDriverItem[]
  } | null
  warnings?: Array<{
    id: string
    warning_type: string
    severity: string
    title: string
    message: string
  }>
}

export interface GroundedPortfolioContext {
  total_projects: number
  risk_distribution: {
    critical: number
    high: number
    medium: number
    low: number
    high_or_critical_pct: number
  }
  high_priority_projects: Array<{
    project_id: string
    name: string
    sector: string
    cost_overrun_probability: number
    time_overrun_probability: number
    overall_risk_level: string
    burn_gap: number
    milestone_slippage_pct: number
  }>
  top_risk_sectors: Array<{
    sector: string
    total_projects: number
    high_or_critical_count: number
    avg_cost_risk: number
    avg_time_risk: number
  }>
  warning_summary: {
    total_active_warnings: number
    critical_warnings: number
    high_warnings: number
    common_types: Array<{ type: string; count: number }>
  }
}

export interface GroundedComparisonContext {
  project_a: GroundedProjectContext
  project_b: GroundedProjectContext
}

export type GroundedContext =
  | { type: 'PROJECT'; data: GroundedProjectContext; projectId: string }
  | { type: 'PORTFOLIO'; data: GroundedPortfolioContext }
  | { type: 'COMPARISON'; data: GroundedComparisonContext; projectAId: string; projectBId: string }
  | { type: 'GENERAL'; data: { available_projects_count: number; supported_topics: string[] } }

export interface AssistantResponse {
  answer: string
  evidence: string[]
  model_signals: string[]
  recommendations: string[]
  limitations: string[]
  projectId?: string
  intent?: 'PROJECT_ANALYSIS' | 'PORTFOLIO_OVERVIEW' | 'PROJECT_COMPARISON' | 'DECISION_SUPPORT' | 'GENERAL'
}

export const AssistantChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message exceeds 2000 characters limit'),
  projectId: z.string().trim().optional(),
  conversationId: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    )
    .optional(),
})

export type AssistantChatRequest = z.infer<typeof AssistantChatRequestSchema>
