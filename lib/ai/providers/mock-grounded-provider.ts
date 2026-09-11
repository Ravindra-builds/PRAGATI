/**
 * Deterministic Grounded Offline LLM Provider for PRAGATI Assistant.
 *
 * Provides high-fidelity, grounded, rule-based structured responses directly from
 * application database telemetry and ML outputs. Used when no external API key is
 * configured, or during offline test execution.
 */

import { LLMProvider } from './provider-interface'
import { AssistantResponse, ChatMessage, GroundedContext } from '../types'

export class MockGroundedProvider implements LLMProvider {
  readonly name = 'mock-grounded'

  async generateResponse(
    prompt: string,
    _systemPrompt: string,
    context: GroundedContext,
    _history?: ChatMessage[]
  ): Promise<AssistantResponse> {
    void _history
    void _systemPrompt
    void prompt
    switch (context.type) {
      case 'PROJECT': {
        const p = context.data
        const costProb = p.predictions?.cost_overrun_probability ?? 0.25
        const timeProb = p.predictions?.time_overrun_probability ?? 0.25
        const riskLevel = p.predictions?.overall_risk_level || p.status
        const latest = p.latest_update

        const costProbPct = (costProb * 100).toFixed(1)
        const timeProbPct = (timeProb * 100).toFixed(1)

        const evidence: string[] = []
        if (latest) {
          evidence.push(
            `Physical delivery progress is ${latest.physical_progress_pct.toFixed(1)}% against financial utilization of ${latest.financial_progress_pct.toFixed(1)}% (₹${latest.expenditure_cr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr expended).`
          )
          evidence.push(
            `Milestone status: ${latest.milestones_delayed} of ${latest.milestones_total} milestones are currently delayed.`
          )
          evidence.push(
            `Schedule duration: ${latest.elapsed_months} of ${p.planned_duration_months} planned months elapsed (${(latest.schedule_elapsed_ratio * 100).toFixed(0)}% elapsed).`
          )
        } else {
          evidence.push(`Project profile: Sanctioned cost of ₹${p.original_cost_cr} Cr with a ${p.planned_duration_months}-month planned duration.`)
        }

        const modelSignals: string[] = [
          `Dual-target ML model predicts a ${costProbPct}% probability of cost overrun and a ${timeProbPct}% probability of schedule delay (Overall Risk: ${riskLevel}).`,
        ]

        if (p.risk_drivers?.cost && p.risk_drivers.cost.length > 0) {
          const topCost = p.risk_drivers.cost[0]
          modelSignals.push(`Primary cost risk driver: ${topCost.display_name} (${topCost.value}).`)
        }

        if (p.risk_drivers?.time && p.risk_drivers.time.length > 0) {
          const topTime = p.risk_drivers.time[0]
          modelSignals.push(`Primary schedule risk driver: ${topTime.display_name} (${topTime.value}).`)
        }

        const recommendations: string[] = [
          'Verify that actual physical work completed on-site corresponds to claimed financial expenditure vouchers.',
          'Request an updated milestone recovery schedule and dependency mitigation plan from the implementing agency.',
          'Review land acquisition, environmental clearances, and right-of-way permissions for delayed milestones.',
          'Schedule an inter-departmental coordination review before the next reporting cycle.',
        ]

        const limitations: string[] = [
          'Based on current PRAGATI prototype monitoring data and dual-target ML inference outputs.',
          'On-site inspection reports, contractor dispute logs, and force majeure claims are not included in this snapshot.',
          'Recommendations are advisory decision-support suggestions for monitoring authorities, not official policy determinations.',
        ]

        const answer = `Project ${p.project_id} (${p.name}) is classified as ${riskLevel} risk based on dual-target ML inference. The predictive models evaluate a ${costProbPct}% likelihood of exceeding sanctioned cost and a ${timeProbPct}% likelihood of milestone delivery delays, driven primarily by an observed gap between expenditure and on-ground physical delivery.`

        return {
          answer,
          evidence,
          model_signals: modelSignals,
          recommendations,
          limitations,
          projectId: p.project_id,
          intent: 'PROJECT_ANALYSIS',
        }
      }

      case 'PORTFOLIO': {
        const pf = context.data
        const dist = pf.risk_distribution

        const evidence: string[] = [
          `The monitored portfolio comprises ${pf.total_projects} infrastructure projects across key national sectors.`,
          `Risk distribution: ${dist.critical} Critical, ${dist.high} High, ${dist.medium} Medium, and ${dist.low} Low risk projects (${dist.high_or_critical_pct.toFixed(1)}% in elevated risk tiers).`,
          `Active alerts: ${pf.warning_summary.total_active_warnings} early warnings active (${pf.warning_summary.critical_warnings} critical, ${pf.warning_summary.high_warnings} high severity).`,
        ]

        const modelSignals: string[] = [
          `Top attention projects with highest compound risk: ${pf.high_priority_projects.slice(0, 3).map((p) => `${p.project_id} (${(p.cost_overrun_probability * 100).toFixed(0)}% cost / ${(p.time_overrun_probability * 100).toFixed(0)}% time)`).join(', ')}.`,
          `Highest risk concentrations are currently observed in sectors: ${pf.top_risk_sectors.slice(0, 3).map((s) => `${s.sector} (${s.high_or_critical_count} elevated)`).join(', ')}.`,
        ]

        const recommendations: string[] = [
          'Prioritize immediate bilateral review meetings for the top Critical-tier projects.',
          'Investigate systemic milestone delays across top high-risk sectors (especially Railway and Road sector projects).',
          'Establish a monthly expenditure-burn review taskforce to address persistent financial vs physical parity gaps.',
        ]

        const limitations: string[] = [
          'Portfolio aggregations reflect current prototype telemetry and dual-target predictive classifications.',
          'State-level administrative interventions and budget allocation revisions may alter project trajectories.',
        ]

        const answer = `Across the ${pf.total_projects}-project portfolio, ${dist.critical + dist.high} projects (${dist.high_or_critical_pct.toFixed(1)}%) exhibit elevated cost or schedule overrun risks. Monitoring focus should be concentrated on projects exhibiting substantial expenditure vs physical progress gaps and multiple delayed milestones.`

        return {
          answer,
          evidence,
          model_signals: modelSignals,
          recommendations,
          limitations,
          intent: 'PORTFOLIO_OVERVIEW',
        }
      }

      case 'COMPARISON': {
        const pA = context.data.project_a
        const pB = context.data.project_b

        const costA = pA.predictions?.cost_overrun_probability ?? 0.5
        const costB = pB.predictions?.cost_overrun_probability ?? 0.5
        const timeA = pA.predictions?.time_overrun_probability ?? 0.5
        const timeB = pB.predictions?.time_overrun_probability ?? 0.5

        const evidence: string[] = [
          `${pA.project_id} (${pA.name}): Physical ${pA.latest_update?.physical_progress_pct.toFixed(1)}%, Financial ${pA.latest_update?.financial_progress_pct.toFixed(1)}%, ${pA.latest_update?.milestones_delayed}/${pA.latest_update?.milestones_total} milestones delayed.`,
          `${pB.project_id} (${pB.name}): Physical ${pB.latest_update?.physical_progress_pct.toFixed(1)}%, Financial ${pB.latest_update?.financial_progress_pct.toFixed(1)}%, ${pB.latest_update?.milestones_delayed}/${pB.latest_update?.milestones_total} milestones delayed.`,
        ]

        const modelSignals: string[] = [
          `Cost Overrun Risk: ${pA.project_id} is ${(costA * 100).toFixed(1)}% vs ${pB.project_id} at ${(costB * 100).toFixed(1)}%.`,
          `Schedule Delay Risk: ${pA.project_id} is ${(timeA * 100).toFixed(1)}% vs ${pB.project_id} at ${(timeB * 100).toFixed(1)}%.`,
        ]

        const higherRiskProject = costA + timeA >= costB + timeB ? pA.project_id : pB.project_id

        const recommendations: string[] = [
          `Prioritize direct oversight on ${higherRiskProject} due to higher aggregate predictive risk signals.`,
          'Compare procurement and contractor performance histories between the two implementing agencies.',
          'Review the recovery schedule of delayed milestones for both projects in the upcoming review.',
        ]

        const limitations: string[] = [
          'Direct comparison assumes standard baseline monitoring conventions across both agencies.',
          'Prototype telemetry does not capture differing geographical terrain difficulties.',
        ]

        const answer = `Comparative analysis between ${pA.project_id} and ${pB.project_id} indicates that ${higherRiskProject} exhibits higher overall risk exposure, driven by ${higherRiskProject === pA.project_id ? (costA > costB ? 'elevated budget burn gap' : 'greater milestone delay ratio') : (costB > costA ? 'elevated budget burn gap' : 'greater milestone delay ratio')}.`

        return {
          answer,
          evidence,
          model_signals: modelSignals,
          recommendations,
          limitations,
          intent: 'PROJECT_COMPARISON',
        }
      }

      case 'GENERAL':
      default: {
        return {
          answer:
            'PRAGATI Project Intelligence Assistant helps monitoring authorities evaluate infrastructure project risks, analyze model-supported risk drivers, explore early warning signals, and inspect portfolio execution patterns.',
          evidence: [
            'System monitors 850 infrastructure projects across 5 primary sectors.',
            'Dual-target predictive models provide cost-overrun and schedule-delay probabilities.',
          ],
          model_signals: [
            'Predictions are supported by local SHAP explanations identifying key driving features.',
          ],
          recommendations: [
            'Ask a project question by providing a project ID (e.g. "Why is PRJ-0016 high risk?").',
            'Ask a portfolio question (e.g. "Which projects need the most attention?").',
            'Compare projects (e.g. "Compare PRJ-0016 and PRJ-0004").',
          ],
          limitations: [
            'Operating in prototype demonstration mode with verified synthetic monitoring dataset.',
          ],
          intent: 'GENERAL',
        }
      }
    }
  }
}
