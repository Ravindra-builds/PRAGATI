/**
 * Database Seed Script: Project & Snapshot Data
 *
 * Imports synthetic projects and monthly monitoring snapshots from:
 *   ml/data/synthetic/projects_snapshot.csv
 *
 * Enforces:
 * - One unique row per project in 'projects' table (marked is_synthetic: true)
 * - Chronological snapshots in 'project_updates' table
 * - Strict exclusion of target outcome variables (final_cost_cr, actual_duration_months, cost_overrun, time_overrun)
 *
 * Usage:
 *   npm run seed
 *   # or: npx tsx scripts/seed-projects.ts
 */

import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface RawSnapshot {
  project_id: string
  snapshot_month: string
  ministry: string
  sector: string
  implementing_agency: string
  state: string
  original_cost_cr: number
  planned_duration_months: number
  elapsed_months: number
  physical_progress_pct: number
  financial_progress_pct: number
  expenditure_cr: number
  milestones_total: number
  milestones_delayed: number
  project_status: string
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(filePath: string): RawSnapshot[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const header = parseCSVLine(lines[0])
  const rows: RawSnapshot[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const parts = parseCSVLine(line)

    const rowObj: Record<string, string> = {}
    for (let j = 0; j < header.length; j++) {
      rowObj[header[j]] = parts[j]?.trim() ?? ''
    }

    rows.push({
      project_id: rowObj.project_id,
      snapshot_month: rowObj.snapshot_month,
      ministry: rowObj.ministry,
      sector: rowObj.sector,
      implementing_agency: rowObj.implementing_agency,
      state: rowObj.state,
      original_cost_cr: parseFloat(rowObj.original_cost_cr),
      planned_duration_months: parseInt(rowObj.planned_duration_months, 10),
      elapsed_months: parseInt(rowObj.elapsed_months, 10),
      physical_progress_pct: parseFloat(rowObj.physical_progress_pct),
      financial_progress_pct: parseFloat(rowObj.financial_progress_pct),
      expenditure_cr: parseFloat(rowObj.expenditure_cr),
      milestones_total: parseInt(rowObj.milestones_total, 10),
      milestones_delayed: parseInt(rowObj.milestones_delayed, 10),
      project_status: rowObj.project_status,
    })
  }

  return rows
}

async function main() {
  console.log('====================================================')
  console.log('🌱 SIH Infrastructure Monitoring: Database Seeder')
  console.log('====================================================')

  const csvPath = path.resolve(__dirname, '../ml/data/synthetic/projects_snapshot.csv')
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV dataset not found at: ${csvPath}`)
    console.error('Run "python ml/src/generate_synthetic_data.py" first.')
    process.exit(1)
  }

  console.log(`Reading dataset from: ${csvPath}`)
  const rawRows = parseCSV(csvPath)
  console.log(`Parsed ${rawRows.length} snapshot rows.`)

  // Group by project_id to extract unique project entities
  const projectMap = new Map<string, RawSnapshot[]>()
  for (const row of rawRows) {
    if (!projectMap.has(row.project_id)) {
      projectMap.set(row.project_id, [])
    }
    projectMap.get(row.project_id)!.push(row)
  }

  console.log(`Found ${projectMap.size} unique infrastructure projects.`)
  console.log('Beginning database upsert (batching updates)...')

  let projectCount = 0
  let updateCount = 0

  for (const [projectId, snapshots] of projectMap.entries()) {
    // Sort snapshots chronologically
    snapshots.sort((a, b) => a.snapshot_month.localeCompare(b.snapshot_month))
    const firstSnap = snapshots[0]
    const lastSnap = snapshots[snapshots.length - 1]

    const projectName = `${firstSnap.sector} Infrastructure - ${firstSnap.implementing_agency} (${firstSnap.state})`

    // Upsert project
    await prisma.project.upsert({
      where: { projectId },
      update: {
        status: lastSnap.project_status,
      },
      create: {
        projectId,
        name: projectName,
        ministry: firstSnap.ministry,
        sector: firstSnap.sector,
        implementingAgency: firstSnap.implementing_agency,
        state: firstSnap.state,
        originalCostCr: firstSnap.original_cost_cr,
        plannedDurationMonths: firstSnap.planned_duration_months,
        status: lastSnap.project_status,
        isSynthetic: true, // Clearly mark all seeded records as synthetic
      },
    })
    projectCount++

    // Insert snapshots
    for (const snap of snapshots) {
      await prisma.projectUpdate.upsert({
        where: {
          projectId_snapshotMonth: {
            projectId: snap.project_id,
            snapshotMonth: snap.snapshot_month,
          },
        },
        update: {},
        create: {
          projectId: snap.project_id,
          snapshotMonth: snap.snapshot_month,
          elapsedMonths: snap.elapsed_months,
          physicalProgressPct: snap.physical_progress_pct,
          financialProgressPct: snap.financial_progress_pct,
          expenditureCr: snap.expenditure_cr,
          milestonesTotal: snap.milestones_total,
          milestonesDelayed: snap.milestones_delayed,
          projectStatus: snap.project_status,
        },
      })
      updateCount++
    }

    if (projectCount % 100 === 0 || projectCount === projectMap.size) {
      console.log(`  Processed ${projectCount}/${projectMap.size} projects (${updateCount} snapshots)...`)
    }
  }

  console.log('----------------------------------------------------')
  console.log(`✅ Seed Complete!`)
  console.log(`   Projects inserted/verified : ${projectCount}`)
  console.log(`   Snapshots inserted/verified: ${updateCount}`)
  console.log(`   All records marked with is_synthetic: true`)
  console.log('====================================================')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
