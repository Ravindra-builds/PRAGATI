/**
 * Batch Prediction Generator Script.
 *
 * Calls the FastAPI ML inference service for projects with active snapshots,
 * persists the predictions in PostgreSQL, and generates prototype early warnings.
 *
 * Usage:
 *   npm run seed:predictions
 *   # or: npx tsx scripts/seed-predictions.ts [optional_limit]
 */

import { PrismaClient } from '@prisma/client'
import { mlClient } from '../lib/ml-client'
import { predictionService } from '../lib/services/prediction-service'

const prisma = new PrismaClient()

async function main() {
  console.log('====================================================')
  console.log('⚡ SIH ML Inference: Batch Prediction Generator')
  console.log('====================================================')

  // 1. Verify ML Service Health
  console.log('1. Checking ML Service Health...')
  try {
    const health = await mlClient.checkHealth()
    console.log(`   Service Status : ${health.status}`)
    console.log(`   Models Loaded  : ${health.models_loaded}`)
    if (!health.models_loaded) {
      console.error('❌ ML service reported models are not loaded.')
      process.exit(1)
    }
  } catch (err) {
    console.error('❌ Could not connect to ML service at', process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000')
    console.error('   Please start the ML service first:')
    console.error('   .\\ml\\.venv\\Scripts\\python.exe -m uvicorn ml.api.main:app --port 8000')
    process.exit(1)
  }

  // 2. Fetch projects
  const limitArg = process.argv[2] ? parseInt(process.argv[2], 10) : 25
  console.log(`2. Fetching up to ${limitArg} projects from database...`)

  const projects = await prisma.project.findMany({
    take: limitArg,
    orderBy: { projectId: 'asc' },
    select: { projectId: true, name: true, sector: true },
  })

  if (projects.length === 0) {
    console.warn('⚠️ No projects found in database. Run "npm run seed" first!')
    process.exit(0)
  }

  console.log(`3. Generating predictions for ${projects.length} projects...`)

  let successCount = 0
  let totalWarnings = 0
  const riskCounts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 }

  for (const p of projects) {
    try {
      const res = await predictionService.generatePrediction(p.projectId)
      successCount++
      totalWarnings += res.warnings.length
      const risk = res.prediction.overallRiskLevel
      riskCounts[risk] = (riskCounts[risk] || 0) + 1

      console.log(
        `  [${p.projectId}] Risk: ${risk.padEnd(6)} | Cost Prob: ${(res.prediction.costOverrunProbability * 100).toFixed(1)}% | Time Prob: ${(res.prediction.timeOverrunProbability * 100).toFixed(1)}% | Warnings: ${res.warnings.length}`
      )
    } catch (err) {
      console.error(`  ❌ Failed predicting for ${p.projectId}:`, (err as Error).message)
    }
  }

  console.log('----------------------------------------------------')
  console.log(`✅ Batch Prediction Complete!`)
  console.log(`   Successful Predictions : ${successCount}/${projects.length}`)
  console.log(`   Early Warnings Created : ${totalWarnings}`)
  console.log(`   Risk Distribution      : HIGH=${riskCounts.HIGH || 0}, MEDIUM=${riskCounts.MEDIUM || 0}, LOW=${riskCounts.LOW || 0}`)
  console.log('====================================================')
}

main()
  .catch((e) => {
    console.error('❌ Batch prediction script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
