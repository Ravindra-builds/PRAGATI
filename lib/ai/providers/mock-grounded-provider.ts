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

    const lowerPrompt = (prompt || '').toLowerCase()
    const isAskingAboutPragati =
      lowerPrompt.includes('what is pragati') ||
      lowerPrompt.includes('what does pragati mean') ||
      lowerPrompt.includes('pragati mean') ||
      lowerPrompt.includes('about pragati') ||
      lowerPrompt.includes('explain pragati') ||
      lowerPrompt.includes('who is pragati') ||
      lowerPrompt.includes('what is this platform') ||
      (lowerPrompt.includes('what') && lowerPrompt.includes('pragati')) ||
      (lowerPrompt.includes('meaning') && lowerPrompt.includes('pragati'))

    if (isAskingAboutPragati) {
      return {
        answer:
          'PRAGATI stands for "Pro-Active Governance And Timely Implementation" (in national institutional governance) and represents "Predictive Infrastructure Monitoring & Analytics" in this SIH 2026 platform. It is an AI-powered early warning and decision-support system designed to forecast cost escalations and schedule delays across major national infrastructure projects before compounding delays occur.',
        evidence: [
          'Dual Meaning: "Pro-Active Governance And Timely Implementation" (institutional program) / "Predictive Infrastructure Monitoring & Analytics" (SIH 2026 system).',
          'Standards Alignment: Modeled after MoSPI PAIMANA (Project Assessment, Information Management & Analytics) and OCMS monitoring conventions.',
          'Portfolio Scope: Monitors 850 infrastructure projects across Roads & Highways, Railways, Urban Development, Energy, and Water Resources.',
          'Observation-Time Telemetry: Tracks physical progress %, financial progress %, cumulative expenditure, and milestone delivery status.',
        ],
        model_signals: [
          'Dual-Target ML: Calibrated Logistic Regression for Cost Overrun Risk and Random Forest for Schedule Delay Risk.',
          'Local SHAP Explainability: Explains every prediction using feature attributions (expenditure burn gaps, schedule-progress slippages, milestone delays).',
          'Strict Anti-Leakage Quarantine: Post-completion actual outcomes are excluded during observation-time inference.',
        ],
        recommendations: [
          'Review the Portfolio Dashboard for macro KPIs, risk distribution tiers, and real-time alert feeds.',
          'Search specific projects in the Projects Directory or inspect a Project Dossier with SHAP drivers.',
          'Triage critical milestone slippage and expenditure burn anomalies in the Early Warning Center (Alerts).',
          'Analyze sector distributions and compare projects side-by-side in Portfolio Analytics.',
        ],
        limitations: [
          'Currently operating in prototype demonstration mode with verified synthetic monitoring telemetry.',
          'Unrecorded external factors such as contractual litigation or adverse weather events are not captured in snapshot telemetry.',
          'All predictions and recommendations are advisory decision-support signals intended to assist monitoring authorities.',
        ],
        intent: 'GENERAL',
      }
    }

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
            `Physical delivery progress is ${latest.physical_progress_pct.toFixed(1)}% against financial utilization of ${latest.financial_progress_pct.toFixed(1)}% (₹${latest.expenditure_cr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr expended of ₹${p.original_cost_cr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr sanctioned).`
          )
          evidence.push(
            `Milestone status: ${latest.milestones_delayed} of ${latest.milestones_total} milestones are currently delayed (${latest.milestones_total > 0 ? Math.round((latest.milestones_delayed / latest.milestones_total) * 100) : 0}% slippage).`
          )
          evidence.push(
            `Schedule duration: ${latest.elapsed_months} of ${p.planned_duration_months} planned months elapsed (${(latest.schedule_elapsed_ratio * 100).toFixed(0)}% elapsed).`
          )
        } else {
          evidence.push(`Project profile: Sanctioned cost of ₹${p.original_cost_cr} Cr with a ${p.planned_duration_months}-month planned duration.`)
        }

        if (p.warnings && p.warnings.length > 0 && (lowerPrompt.includes('warning') || lowerPrompt.includes('alert') || lowerPrompt.includes('signal'))) {
          for (const w of p.warnings.slice(0, 3)) {
            evidence.push(`Active Warning [${w.warning_type} - ${w.severity}]: ${w.title} — ${w.message}`)
          }
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
          `Verify that actual physical work completed on-site (${latest?.physical_progress_pct.toFixed(1) ?? 0}%) corresponds to claimed financial expenditure vouchers (${latest?.financial_progress_pct.toFixed(1) ?? 0}%).`,
          `Request an updated milestone recovery schedule from ${p.implementing_agency} for the ${latest?.milestones_delayed ?? 0} delayed milestones.`,
          `Review right-of-way (RoW), utility shifting, and statutory clearance dependencies in ${p.state}.`,
          `Schedule an inter-departmental PRAGATI review with ${p.ministry} before the next monthly reporting cycle.`,
        ]

        const limitations: string[] = [
          'Based on current PRAGATI prototype monitoring data and dual-target ML inference outputs.',
          'On-site inspection reports, contractor dispute logs, and force majeure claims are not included in this snapshot.',
        ]

        let answer = `Project ${p.project_id} (${p.name}) in ${p.state} is classified as ${riskLevel} risk based on dual-target ML inference (${costProbPct}% cost overrun risk / ${timeProbPct}% schedule delay risk), driven by a ${(latest?.burn_gap ?? 0).toFixed(1)}% financial-vs-physical burn gap and ${latest?.milestones_delayed ?? 0} delayed milestones.`

        if (lowerPrompt.includes('schedule') || lowerPrompt.includes('delay') || lowerPrompt.includes('time')) {
          answer = `Schedule delay risk for ${p.project_id} (${p.name}) is evaluated at ${timeProbPct}% (Random Forest model). The primary schedule bottleneck is that ${latest?.elapsed_months ?? 0} of ${p.planned_duration_months} approved months (${((latest?.schedule_elapsed_ratio ?? 0) * 100).toFixed(0)}%) have elapsed while physical completion stands at ${latest?.physical_progress_pct.toFixed(1) ?? 0}%, compounded by ${latest?.milestones_delayed ?? 0} of ${latest?.milestones_total ?? 0} contractual milestones slipping behind schedule.`
        } else if (lowerPrompt.includes('warning') || lowerPrompt.includes('alert') || lowerPrompt.includes('signal')) {
          const warnSummary =
            p.warnings && p.warnings.length > 0
              ? p.warnings.map((w) => `${w.title} (${w.severity})`).join(', ')
              : 'no active rule breaches'
          answer = `Project ${p.project_id} (${p.name}) currently has ${p.warnings?.length || 0} active early warning signal(s): ${warnSummary}. These advisories were triggered by its ${costProbPct}% cost overrun risk, ${timeProbPct}% schedule delay probability, and a ${(latest?.burn_gap ?? 0).toFixed(1)}% expenditure burn gap.`
        } else if (lowerPrompt.includes('remedial') || lowerPrompt.includes('action') || lowerPrompt.includes('recommend') || lowerPrompt.includes('committee')) {
          answer = `For ${p.project_id} (${p.name}), the monitoring committee should prioritize: (1) auditing RA bills with ${p.implementing_agency} to reconcile the ${(latest?.burn_gap ?? 0).toFixed(1)}% expenditure-to-physical gap, (2) enforcing a recovery plan for the ${latest?.milestones_delayed ?? 0} delayed milestones, and (3) resolving state-level RoW/utility bottlenecks in ${p.state}.`
        }

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

        // 1. Query about States / Geographic Concentration
        if (lowerPrompt.includes('state') || lowerPrompt.includes('geographic') || lowerPrompt.includes('where')) {
          const states = pf.top_risk_states || []
          const top3States = states.slice(0, 4)
          return {
            answer: `Geographic risk analysis across the ${pf.total_projects}-project portfolio shows the highest concentration of delayed and high-risk projects in ${top3States.map((s) => `${s.state} (${s.high_or_critical_count} high/critical of ${s.total_projects} projects)`).join(', ')}.`,
            evidence: states.slice(0, 5).map(
              (s) =>
                `${s.state}: ${s.high_or_critical_count} elevated-risk projects out of ${s.total_projects} total (Avg Delay Risk: ${(s.avg_time_risk * 100).toFixed(1)}%, Avg Burn Gap: +${s.avg_burn_gap.toFixed(1)}%).`
            ),
            model_signals: [
              `State-level delay probabilities are highest in ${top3States.map((s) => `${s.state} (${(s.avg_time_risk * 100).toFixed(1)}% avg delay risk)`).join(', ')}.`,
              `Cost overrun exposure correlates strongly with states exhibiting average financial-vs-physical burn gaps above +10%.`,
            ],
            recommendations: [
              `Convene joint Chief Secretary / PRAGATI nodal reviews in ${top3States.slice(0, 2).map((s) => s.state).join(' and ')} to clear land acquisition and statutory forest/utility bottlenecks.`,
              'Establish state-wise milestone tracking dashboards for agencies operating in high-slippage corridors.',
            ],
            limitations: [
              'Based on current PRAGATI portfolio telemetry and dual-target ML risk aggregations across states.',
            ],
            intent: 'PORTFOLIO_OVERVIEW',
          }
        }

        // 2. Query about Financial Expenditure ahead of Physical Progress (Burn Gap)
        if (
          lowerPrompt.includes('financial') ||
          lowerPrompt.includes('expenditure') ||
          lowerPrompt.includes('burn') ||
          lowerPrompt.includes('ahead of physical')
        ) {
          const burnProjects = pf.top_burn_gap_projects || []
          return {
            answer: `Across the portfolio, the projects with the largest divergence where financial expenditure outpaces on-ground physical progress are ${burnProjects.slice(0, 3).map((b) => `${b.project_id} (+${b.burn_gap.toFixed(1)}% gap)`).join(', ')}. This expenditure-burn anomaly is the #1 predictor of eventual budget overruns in our L2 Logistic Regression model.`,
            evidence: burnProjects.slice(0, 5).map(
              (b) =>
                `${b.project_id} (${b.name} — ${b.sector}, ${b.state}): Financial utilization at ${b.financial_progress_pct.toFixed(1)}% vs Physical delivery at ${b.physical_progress_pct.toFixed(1)}% (Burn Gap: +${b.burn_gap.toFixed(1)}%).`
            ),
            model_signals: burnProjects.slice(0, 3).map(
              (b) =>
                `${b.project_id}: ${(b.cost_overrun_probability * 100).toFixed(1)}% predicted cost overrun probability (${b.overall_risk_level} risk tier).`
            ),
            recommendations: [
              'Audit Utilization Certificates (UCs) and contractor running-account (RA) bills for projects with burn gaps exceeding +15%.',
              'Gate further mobilization or material advance disbursements on verified physical milestone completion.',
            ],
            limitations: [
              'High financial utilization in early phases can occasionally reflect legitimate upfront equipment procurement or land compensation payouts.',
            ],
            intent: 'PORTFOLIO_OVERVIEW',
          }
        }

        // 3. Query about Specific Sectors (Railways, Road Transport, Power, Urban, etc.)
        if (
          lowerPrompt.includes('rail') ||
          lowerPrompt.includes('road') ||
          lowerPrompt.includes('highway') ||
          lowerPrompt.includes('power') ||
          lowerPrompt.includes('urban')
        ) {
          const highlights = pf.sector_highlights || []
          const matchingSectors = pf.top_risk_sectors.filter(
            (s) =>
              (lowerPrompt.includes('rail') && s.sector.toLowerCase().includes('rail')) ||
              ((lowerPrompt.includes('road') || lowerPrompt.includes('highway')) &&
                (s.sector.toLowerCase().includes('road') || s.sector.toLowerCase().includes('highway'))) ||
              (lowerPrompt.includes('power') && s.sector.toLowerCase().includes('power')) ||
              (lowerPrompt.includes('urban') && s.sector.toLowerCase().includes('urban'))
          )
          const targetSectors = matchingSectors.length > 0 ? matchingSectors : pf.top_risk_sectors.slice(0, 2)

          return {
            answer: `In the requested infrastructure sector(s) (${targetSectors.map((s) => s.sector).join(' & ')}), ${targetSectors.reduce((acc, s) => acc + s.high_or_critical_count, 0)} projects are flagged in High or Critical risk tiers. Top flagged projects include ${highlights.slice(0, 3).map((h) => `${h.project_id} (${(h.cost_overrun_probability * 100).toFixed(0)}% cost / ${(h.time_overrun_probability * 100).toFixed(0)}% schedule risk)`).join(', ')}.`,
            evidence: [
              ...targetSectors.map(
                (s) =>
                  `Sector ${s.sector}: ${s.high_or_critical_count} of ${s.total_projects} projects in High/Critical tier (Avg Cost Risk: ${(s.avg_cost_risk * 100).toFixed(1)}%, Avg Schedule Risk: ${(s.avg_time_risk * 100).toFixed(1)}%).`
              ),
              ...highlights.slice(0, 4).map(
                (h) =>
                  `${h.project_id} (${h.name} — ${h.sector}, ${h.state}): Cost Risk ${(h.cost_overrun_probability * 100).toFixed(1)}%, Schedule Risk ${(h.time_overrun_probability * 100).toFixed(1)}%, Burn Gap +${h.burn_gap.toFixed(1)}%.`
              ),
            ],
            model_signals: [
              `Logistic Regression and Random Forest models identify ${highlights[0]?.project_id || 'PRJ-0012'} and ${highlights[1]?.project_id || 'PRJ-0028'} as having the highest compound overrun likelihood in this cohort.`,
              `Primary sector risk drivers: Right-of-Way (RoW) acquisition lag, utility shifting delays, and expenditure burn divergence.`,
            ],
            recommendations: [
              `Prioritize ministerial review for ${highlights.slice(0, 3).map((h) => h.project_id).join(', ')} before the next quarterly capex tranche release.`,
              'Enforce strict physical-milestone verification for corridor projects showing >15% financial burn gaps.',
            ],
            limitations: [
              'Based on current PRAGATI prototype sector telemetry and dual-target ML inference.',
            ],
            intent: 'PORTFOLIO_OVERVIEW',
          }
        }

        // 4. Default / Early Warning Patterns Portfolio Overview
        const evidence: string[] = [
          `The monitored portfolio comprises ${pf.total_projects} infrastructure projects across key national sectors.`,
          `Risk distribution: ${dist.critical} Critical, ${dist.high} High, ${dist.medium} Medium, and ${dist.low} Low risk projects (${dist.high_or_critical_pct.toFixed(1)}% in elevated risk tiers).`,
          `Active alerts: ${pf.warning_summary.total_active_warnings} early warnings active (${pf.warning_summary.critical_warnings} critical, ${pf.warning_summary.high_warnings} high severity) across ${pf.warning_summary.common_types.map((t) => `${t.type} (${t.count})`).join(', ')}.`,
        ]

        const modelSignals: string[] = [
          `Top attention projects with highest compound risk: ${pf.high_priority_projects.slice(0, 3).map((p) => `${p.project_id} (${(p.cost_overrun_probability * 100).toFixed(0)}% cost / ${(p.time_overrun_probability * 100).toFixed(0)}% time)`).join(', ')}.`,
          `Highest risk concentrations are currently observed in sectors: ${pf.top_risk_sectors.slice(0, 3).map((s) => `${s.sector} (${s.high_or_critical_count} elevated)`).join(', ')}.`,
        ]

        const recommendations: string[] = [
          'Prioritize immediate bilateral review meetings for the top Critical-tier projects.',
          'Investigate systemic milestone delays across top high-risk sectors (especially Power, Urban Development, and Roads & Highways).',
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
