"""
Unit tests for Feature Engineering, Target Quarantine, Preprocessing, and Validation Splitting.
"""

import sys
import unittest
from pathlib import Path
import numpy as np
import pandas as pd

# Add ml/src to sys.path
src_dir = Path(__file__).resolve().parent.parent / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

import targets
import features
import preprocessing
import split


class TestFeaturesAndQuarantine(unittest.TestCase):
    def setUp(self):
        """Create a synthetic mini-batch for unit testing."""
        self.sample_df = pd.DataFrame({
            "project_id": ["P1", "P1", "P2", "P3"],
            "snapshot_month": ["2023-01", "2023-04", "2023-02", "2023-05"],
            "ministry": ["MoRTH", "MoRTH", "MoR", "MoP"],
            "sector": ["Roads", "Roads", "Railways", "Power"],
            "implementing_agency": ["NHAI", "NHAI", "RVNL", "NTPC"],
            "state": ["Maharashtra", "Maharashtra", "Gujarat", "Delhi"],
            "original_cost_cr": [100.0, 100.0, 500.0, 0.0],  # test edge case 0.0 cost
            "planned_duration_months": [20, 20, 50, 0],       # test edge case 0 planned months
            "elapsed_months": [5, 10, 15, 2],
            "physical_progress_pct": [20.0, 45.0, 10.0, 5.0],
            "financial_progress_pct": [25.0, 55.0, 30.0, 8.0],
            "expenditure_cr": [25.0, 55.0, 150.0, 0.0],
            "milestones_total": [10, 10, 20, 0],              # test edge case 0 milestones
            "milestones_delayed": [1, 2, 5, 0],
            "project_status": ["Ongoing", "Delayed", "Critical", "Ongoing"],
            # Future outcome variables
            "final_cost_cr": [115.0, 115.0, 620.0, 10.0],
            "actual_duration_months": [24, 24, 62, 12],
            "cost_overrun": [1, 1, 1, 0],
            "time_overrun": [1, 1, 1, 0],
        })

    def test_target_quarantine(self):
        """Test that target quarantine strictly removes all outcome and label fields from X."""
        X, y = targets.separate_targets(self.sample_df)

        for col in targets.EXCLUDED_OUTCOME_COLUMNS:
            self.assertNotIn(col, X.columns, f"Quarantined column '{col}' leaked into X!")

        self.assertIn("cost_overrun", y.columns)
        self.assertIn("time_overrun", y.columns)

        # Assert no leakage raises error if outcome columns are forcibly reintroduced
        leaky_df = X.copy()
        leaky_df["final_cost_cr"] = 120.0
        with self.assertRaises(ValueError):
            targets.assert_no_leakage(leaky_df)

    def test_schedule_completion_and_zero_division(self):
        """Test schedule completion calculation and safe division when planned_duration <= 0."""
        res = features.calculate_schedule_completion(
            self.sample_df["elapsed_months"],
            self.sample_df["planned_duration_months"]
        )
        # P1 month 5/20 = 25%
        self.assertAlmostEqual(res.iloc[0], 25.0)
        # P1 month 10/20 = 50%
        self.assertAlmostEqual(res.iloc[1], 50.0)
        # P3 planned = 0, should safely clip denominator without NaN or Inf
        self.assertFalse(np.isinf(res.iloc[3]))
        self.assertFalse(np.isnan(res.iloc[3]))

    def test_schedule_progress_gap(self):
        """Test schedule progress gap: schedule_completion_pct - physical_progress_pct."""
        sched_comp = pd.Series([25.0, 50.0, 30.0])
        phys_prog = pd.Series([20.0, 45.0, 10.0])
        gap = features.calculate_schedule_progress_gap(sched_comp, phys_prog)

        self.assertAlmostEqual(gap.iloc[0], 5.0)
        self.assertAlmostEqual(gap.iloc[1], 5.0)
        self.assertAlmostEqual(gap.iloc[2], 20.0)

    def test_expenditure_burn_gap(self):
        """Test expenditure burn gap: financial_progress_pct - physical_progress_pct."""
        fin_prog = self.sample_df["financial_progress_pct"]
        phys_prog = self.sample_df["physical_progress_pct"]
        burn_gap = features.calculate_expenditure_burn_gap(fin_prog, phys_prog)

        # P1 snap 1: 25 - 20 = 5.0
        self.assertAlmostEqual(burn_gap.iloc[0], 5.0)
        # P1 snap 2: 55 - 45 = 10.0
        self.assertAlmostEqual(burn_gap.iloc[1], 10.0)
        # P2 snap 1: 30 - 10 = 20.0
        self.assertAlmostEqual(burn_gap.iloc[2], 20.0)

    def test_milestone_slippage_ratio_and_zero_division(self):
        """Test milestone slippage ratio and zero total milestones division safety."""
        ratio = features.calculate_milestone_slippage_ratio(
            self.sample_df["milestones_delayed"],
            self.sample_df["milestones_total"]
        )
        # P1 snap 1: 1 / 10 = 0.1
        self.assertAlmostEqual(ratio.iloc[0], 0.1)
        # P1 snap 2: 2 / 10 = 0.2
        self.assertAlmostEqual(ratio.iloc[1], 0.2)
        # P3: 0 delayed / 0 total -> should be 0.0, no NaN or Inf
        self.assertEqual(ratio.iloc[3], 0.0)
        self.assertFalse(np.isnan(ratio.iloc[3]))
        self.assertFalse(np.isinf(ratio.iloc[3]))

    def test_budget_utilization_and_zero_cost(self):
        """Test budget utilization and zero original cost division safety."""
        util = features.calculate_budget_utilization(
            self.sample_df["expenditure_cr"],
            self.sample_df["original_cost_cr"]
        )
        # P1: 25 / 100 = 25%
        self.assertAlmostEqual(util.iloc[0], 25.0)
        # P2: 150 / 500 = 30%
        self.assertAlmostEqual(util.iloc[2], 30.0)
        # P3: original_cost = 0, expenditure = 0 -> no crash, finite
        self.assertFalse(np.isnan(util.iloc[3]))
        self.assertFalse(np.isinf(util.iloc[3]))

    def test_velocity_calculations(self):
        """Test incremental and cumulative velocity calculations."""
        phys_vel, cost_vel = features.calculate_velocities(self.sample_df)

        # P1 snapshot 1 (cumulative fallback): 20% / 5 months = 4.0 %/month
        self.assertAlmostEqual(phys_vel.iloc[0], 4.0)
        self.assertAlmostEqual(cost_vel.iloc[0], 5.0)  # 25 Cr / 5 months = 5.0 Cr/month

        # P1 snapshot 2 (incremental): (45 - 20) / (10 - 5) = 25 / 5 = 5.0 %/month
        self.assertAlmostEqual(phys_vel.iloc[1], 5.0)
        # expenditure incremental: (55 - 25) / (10 - 5) = 30 / 5 = 6.0 Cr/month
        self.assertAlmostEqual(cost_vel.iloc[1], 6.0)

    def test_missing_value_imputation(self):
        """Test that preprocessing pipeline handles missing values without errors."""
        df_missing = self.sample_df.copy()
        df_missing.loc[0, "physical_progress_pct"] = np.nan
        df_missing.loc[1, "ministry"] = np.nan

        df_eng = features.engineer_features(df_missing)
        X, _ = targets.separate_targets(df_eng)

        preprocessor = preprocessing.build_preprocessor()
        preprocessor.fit(X)
        X_trans = preprocessor.transform(X)

        self.assertFalse(np.isnan(X_trans).any(), "NaNs remained after preprocessing imputation!")

    def test_split_disjointness_and_preprocessor_leakage(self):
        """Test that train and test projects are strictly disjoint and preprocessor fits only on train."""
        # Create dataset with multiple distinct projects
        projects_data = []
        for p in range(10):
            pid = f"PRJ-{p:02d}"
            for m in range(1, 4):
                projects_data.append({
                    "project_id": pid,
                    "snapshot_month": f"2023-{m:02d}",
                    "ministry": "MoRTH",
                    "sector": "Roads",
                    "implementing_agency": "NHAI",
                    "state": "Maharashtra",
                    "original_cost_cr": 100.0 * (p + 1),
                    "planned_duration_months": 24,
                    "elapsed_months": m * 4,
                    "physical_progress_pct": m * 20.0,
                    "financial_progress_pct": m * 22.0,
                    "expenditure_cr": m * 20.0,
                    "milestones_total": 10,
                    "milestones_delayed": 1,
                    "project_status": "Ongoing",
                    "final_cost_cr": 120.0 * (p + 1),
                    "actual_duration_months": 26,
                    "cost_overrun": 1,
                    "time_overrun": 0,
                })
        big_df = pd.DataFrame(projects_data)
        big_df_eng = features.engineer_features(big_df)

        train_df, test_df, stats = split.project_grouped_temporal_split(big_df_eng, test_size=0.30)

        # Check strict project disjointness
        train_pids = set(train_df["project_id"])
        test_pids = set(test_df["project_id"])
        self.assertEqual(len(train_pids.intersection(test_pids)), 0)

        # Preprocessor fit check: verify fitting on train transforms test without issue
        X_train, _ = targets.separate_targets(train_df)
        X_test, _ = targets.separate_targets(test_df)

        prep = preprocessing.build_preprocessor()
        X_train_proc, X_test_proc, feat_names = preprocessing.fit_transform_train_test(
            prep, X_train, X_test, return_df=True
        )

        self.assertEqual(len(X_train_proc), len(X_train))
        self.assertEqual(len(X_test_proc), len(X_test))
        self.assertFalse(X_train_proc.isnull().any().any())
        self.assertFalse(X_test_proc.isnull().any().any())


if __name__ == "__main__":
    unittest.main()
