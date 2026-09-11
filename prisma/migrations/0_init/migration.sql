-- CreateTable: projects
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ministry" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "implementing_agency" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "original_cost_cr" DOUBLE PRECISION NOT NULL,
    "planned_duration_months" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "is_synthetic" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: project_updates
CREATE TABLE "project_updates" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "snapshot_month" TEXT NOT NULL,
    "elapsed_months" INTEGER NOT NULL,
    "physical_progress_pct" DOUBLE PRECISION NOT NULL,
    "financial_progress_pct" DOUBLE PRECISION NOT NULL,
    "expenditure_cr" DOUBLE PRECISION NOT NULL,
    "milestones_total" INTEGER NOT NULL,
    "milestones_delayed" INTEGER NOT NULL,
    "project_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: predictions
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "project_update_id" TEXT NOT NULL,
    "cost_overrun_probability" DOUBLE PRECISION NOT NULL,
    "cost_prediction" INTEGER NOT NULL,
    "time_overrun_probability" DOUBLE PRECISION NOT NULL,
    "time_prediction" INTEGER NOT NULL,
    "cost_model_version" TEXT NOT NULL,
    "time_model_version" TEXT NOT NULL,
    "overall_risk_level" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: early_warnings
CREATE TABLE "early_warnings" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "project_update_id" TEXT,
    "prediction_id" TEXT,
    "warning_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "early_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_project_id_key" ON "projects"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_updates_project_id_snapshot_month_key" ON "project_updates"("project_id", "snapshot_month");

-- CreateIndex
CREATE INDEX "project_updates_project_id_idx" ON "project_updates"("project_id");

-- CreateIndex
CREATE INDEX "predictions_project_id_idx" ON "predictions"("project_id");

-- CreateIndex
CREATE INDEX "predictions_project_update_id_idx" ON "predictions"("project_update_id");

-- CreateIndex
CREATE INDEX "early_warnings_project_id_idx" ON "early_warnings"("project_id");

-- CreateIndex
CREATE INDEX "early_warnings_warning_type_idx" ON "early_warnings"("warning_type");

-- AddForeignKey
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_project_update_id_fkey" FOREIGN KEY ("project_update_id") REFERENCES "project_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "early_warnings" ADD CONSTRAINT "early_warnings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "early_warnings" ADD CONSTRAINT "early_warnings_project_update_id_fkey" FOREIGN KEY ("project_update_id") REFERENCES "project_updates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "early_warnings" ADD CONSTRAINT "early_warnings_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "predictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
