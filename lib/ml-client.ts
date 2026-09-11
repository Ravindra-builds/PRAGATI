/**
 * Dedicated Client for the FastAPI ML Inference Microservice.
 *
 * Provides typed, validated communication between the Next.js backend and
 * the Python ML service. Runtime validations verify bounds:
 *   - 0.0 <= probability <= 1.0
 *   - prediction in {0, 1}
 *   - risk_level in {"HIGH", "LOW"}
 */

import { z } from 'zod'

// Observation-time prediction input schema (never contains post-completion outcome variables)
export const PredictPayloadSchema = z.object({
  project_id: z.string().min(1),
  snapshot_month: z.string().regex(/^\d{4}-\d{2}$/),
  ministry: z.string().min(1),
  sector: z.string().min(1),
  implementing_agency: z.string().min(1),
  state: z.string().min(1),
  original_cost_cr: z.number().positive(),
  planned_duration_months: z.number().int().positive(),
  elapsed_months: z.number().int().positive(),
  physical_progress_pct: z.number().min(0).max(100),
  financial_progress_pct: z.number().min(0).max(100),
  expenditure_cr: z.number().min(0),
  milestones_total: z.number().int().positive(),
  milestones_delayed: z.number().int().min(0),
  project_status: z.string().min(1),
})

export type PredictPayload = z.infer<typeof PredictPayloadSchema>

// Target prediction response sub-schema
export const TargetResultSchema = z.object({
  probability: z.number().min(0.0).max(1.0),
  prediction: z.union([z.literal(0), z.literal(1)]),
  risk_level: z.enum(['HIGH', 'LOW']),
})

// Full prediction response schema returned by FastAPI
export const PredictResponseSchema = z.object({
  project_id: z.string(),
  cost_overrun: TargetResultSchema,
  time_overrun: TargetResultSchema,
})

export type PredictResponse = z.infer<typeof PredictResponseSchema>

// Health check response schema
export const HealthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
  models_loaded: z.boolean(),
})

export type HealthResponse = z.infer<typeof HealthResponseSchema>

export class MLServiceError extends Error {
  constructor(message: string, public statusCode: number = 500, public details?: unknown) {
    super(message)
    this.name = 'MLServiceError'
  }
}

export class MLServiceUnavailableError extends MLServiceError {
  constructor(message: string = 'ML Inference Service is currently unavailable') {
    super(message, 503)
    this.name = 'MLServiceUnavailableError'
  }
}

export class MLResponseValidationError extends MLServiceError {
  constructor(message: string, details?: unknown) {
    super(message, 502, details)
    this.name = 'MLResponseValidationError'
  }
}

export class MLClient {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000'
    // Trim trailing slashes
    this.baseUrl = this.baseUrl.replace(/\/+$/, '')
  }

  /**
   * Check if the ML Inference service is alive and models are loaded.
   */
  async checkHealth(): Promise<HealthResponse> {
    const url = `${this.baseUrl}/health`
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' })
      if (!res.ok) {
        throw new MLServiceError(`ML health check returned HTTP ${res.status}`, res.status)
      }
      const data = await res.json()
      return HealthResponseSchema.parse(data)
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new MLResponseValidationError('Invalid health response format from ML service', err.errors)
      }
      if (err instanceof MLServiceError) {
        throw err
      }
      throw new MLServiceUnavailableError(`Could not connect to ML service at ${url}: ${String(err)}`)
    }
  }

  /**
   * Retrieve active model metadata and evaluation metrics from ML service.
   */
  async getModelInfo(): Promise<unknown> {
    const url = `${this.baseUrl}/model-info`
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' })
      if (!res.ok) {
        throw new MLServiceError(`ML model-info returned HTTP ${res.status}`, res.status)
      }
      return await res.json()
    } catch (err) {
      if (err instanceof MLServiceError) throw err
      throw new MLServiceUnavailableError(`Could not fetch model info from ML service at ${url}: ${String(err)}`)
    }
  }

  /**
   * Execute real-time dual-target inference.
   * Sends observation-time payload to FastAPI and rigorously validates response structure and numeric bounds.
   */
  async predictOverrun(payload: PredictPayload): Promise<PredictResponse> {
    // Validate payload locally before dispatching
    const validatedPayload = PredictPayloadSchema.parse(payload)

    const url = `${this.baseUrl}/predict`
    let response: Response

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedPayload),
        cache: 'no-store',
      })
    } catch (err) {
      throw new MLServiceUnavailableError(`Failed to connect to ML inference service at ${url}: ${String(err)}`)
    }

    if (!response.ok) {
      let errBody: unknown
      try {
        errBody = await response.json()
      } catch {
        errBody = await response.text()
      }

      if (response.status === 422) {
        throw new MLServiceError(
          `ML Service rejected prediction request with 422 Unprocessable Entity`,
          422,
          errBody
        )
      }

      throw new MLServiceError(
        `ML Service returned error HTTP ${response.status}`,
        response.status,
        errBody
      )
    }

    const data = await response.json()

    // Runtime boundary validation
    try {
      return PredictResponseSchema.parse(data)
    } catch (zodErr) {
      throw new MLResponseValidationError(
        'ML inference response failed schema bounds validation (invalid probability or missing fields)',
        (zodErr as z.ZodError).errors
      )
    }
  }
}

export const mlClient = new MLClient()
export default mlClient
