"""
Synthetic Dataset Generator for Infrastructure Project Monitoring.

Generates realistic, multi-snapshot project-monitoring records simulating
PAIMANA/OCMS monthly monitoring data.
Features 5 distinct project archetypes, temporal consistency, logical dependencies,
and strict prevention of impossible values.
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

# Add ml/src to path for config import
sys.path.insert(0, str(Path(__file__).resolve().parent))
import config


# Realistic administrative mappings
MINISTRY_SECTOR_MAP = {
    "Ministry of Road Transport and Highways": {
        "sectors": ["Roads and Highways"],
        "agencies": ["NHAI", "NHIDCL", "State PWD"],
    },
    "Ministry of Railways": {
        "sectors": ["Railways"],
        "agencies": ["RVNL", "IRCON", "DFCCIL", "CRIS"],
    },
    "Ministry of Power": {
        "sectors": ["Power"],
        "agencies": ["NTPC", "POWERGRID", "NHPC", "SJVN"],
    },
    "Ministry of Housing and Urban Affairs": {
        "sectors": ["Urban Development"],
        "agencies": ["DMRC", "MMRDA", "State Metro Rail Corp", "NBCC"],
    },
    "Ministry of Ports, Shipping and Waterways": {
        "sectors": ["Shipping and Ports"],
        "agencies": ["JNPT", "IPA", "Cochin Shipyard", "IWAI"],
    },
    "Ministry of Petroleum and Natural Gas": {
        "sectors": ["Petroleum and Natural Gas"],
        "agencies": ["ONGC", "IOCL", "GAIL", "BPCL"],
    },
}

INDIAN_STATES = [
    "Maharashtra", "Uttar Pradesh", "Gujarat", "Tamil Nadu", "Karnataka",
    "Madhya Pradesh", "West Bengal", "Rajasthan", "Bihar", "Odisha",
    "Andhra Pradesh", "Telangana", "Assam", "Kerala", "Punjab",
    "Haryana", "Jharkhand", "Chhattisgarh", "Uttarakhand", "Himachal Pradesh",
    "Jammu and Kashmir", "Delhi"
]

ARCHETYPES = [
    "healthy",        # ~35%
    "delayed",        # ~25%
    "cost_pressure",  # ~15%
    "high_risk",      # ~15%
    "mixed_risk",     # ~10%
]

ARCHETYPE_PROBS = [0.35, 0.25, 0.15, 0.15, 0.10]


def generate_synthetic_dataset(
    num_projects: int = 850,
    target_snapshots: int = 8000,
    random_seed: int = config.RANDOM_SEED,
    output_path: Path = None,
) -> pd.DataFrame:
    """
    Generates a realistic multi-snapshot infrastructure project dataset.
    """
    np.random.seed(random_seed)

    if output_path is None:
        output_path = config.get_active_dataset_path("synthetic")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    all_rows = []
    ministries = list(MINISTRY_SECTOR_MAP.keys())

    # Determine snapshots distribution across projects to hit target_snapshots
    avg_snapshots = target_snapshots / num_projects
    snapshot_counts = np.random.randint(
        config.SYNTHETIC_GENERATION_CONFIG["min_snapshots_per_project"],
        config.SYNTHETIC_GENERATION_CONFIG["max_snapshots_per_project"] + 1,
        size=num_projects,
    )
    # Adjust snapshot counts to get close to target_snapshots
    diff = target_snapshots - snapshot_counts.sum()
    if diff != 0:
        indices = np.random.choice(num_projects, size=abs(diff), replace=True)
        for idx in indices:
            if diff > 0 and snapshot_counts[idx] < config.SYNTHETIC_GENERATION_CONFIG["max_snapshots_per_project"]:
                snapshot_counts[idx] += 1
            elif diff < 0 and snapshot_counts[idx] > config.SYNTHETIC_GENERATION_CONFIG["min_snapshots_per_project"]:
                snapshot_counts[idx] -= 1

    project_counter = 1

    for p_idx in range(num_projects):
        project_id = f"PRJ-{project_counter:04d}"
        project_counter += 1

        # 1. Administrative metadata
        ministry = np.random.choice(ministries)
        sector = np.random.choice(MINISTRY_SECTOR_MAP[ministry]["sectors"])
        implementing_agency = np.random.choice(MINISTRY_SECTOR_MAP[ministry]["agencies"])
        state = np.random.choice(INDIAN_STATES)

        # 2. Project size & duration (log-normal cost, correlated duration)
        # Cost ranges from ~30 Cr to ~15,000 Cr
        log_cost = np.random.normal(loc=5.8, scale=1.1)  # exp(5.8) ≈ 330 Cr
        original_cost_cr = round(float(np.clip(np.exp(log_cost), 25.0, 18000.0)), 2)

        # Planned duration: typically 18 to 84 months depending on cost and sector
        base_duration = int(np.clip(14 + (original_cost_cr ** 0.32) * 4.5 + np.random.normal(0, 5), 14, 84))
        planned_duration_months = base_duration

        # Total milestones: scales with duration (roughly 1 milestone every 2-4 months)
        milestones_total = int(np.clip(planned_duration_months // np.random.randint(2, 5), 5, 30))

        # Project start date between 2021-01 and 2023-06
        start_year = np.random.choice([2021, 2022, 2023])
        start_month = np.random.randint(1, 13)
        start_date = datetime(start_year, start_month, 1)

        # 3. Assign project archetype
        archetype = np.random.choice(ARCHETYPES, p=ARCHETYPE_PROBS)

        # 4. Determine final outcome parameters based on archetype (with noise)
        if archetype == "healthy":
            cost_mult = np.random.normal(1.02, 0.04)  # mostly <= 1.10
            duration_mult = np.random.normal(1.03, 0.04)
        elif archetype == "delayed":
            cost_mult = np.random.normal(1.09, 0.05)  # mild to moderate cost increase
            duration_mult = np.random.normal(1.30, 0.12)  # clear time delay
        elif archetype == "cost_pressure":
            cost_mult = np.random.normal(1.28, 0.10)  # clear cost increase
            duration_mult = np.random.normal(1.07, 0.04)  # mild duration drift
        elif archetype == "high_risk":
            cost_mult = np.random.normal(1.38, 0.12)  # high cost overrun
            duration_mult = np.random.normal(1.42, 0.15)  # high time overrun
        else:  # mixed_risk
            cost_mult = np.random.normal(1.12, 0.08)
            duration_mult = np.random.normal(1.14, 0.09)

        # Constrain multipliers to realistic lower bounds
        cost_mult = max(0.95, cost_mult)
        duration_mult = max(0.95, duration_mult)

        final_cost_cr = round(float(original_cost_cr * cost_mult), 2)
        actual_duration_months = int(max(12, round(planned_duration_months * duration_mult)))

        # Derive target overrun labels using 10% prototype threshold
        cost_overrun = 1 if final_cost_cr > round(original_cost_cr * (1.0 + config.COST_OVERRUN_THRESHOLD), 2) else 0
        time_overrun = 1 if actual_duration_months > round(planned_duration_months * (1.0 + config.TIME_OVERRUN_THRESHOLD)) else 0

        # 5. Generate snapshots for this project
        num_snaps = snapshot_counts[p_idx]
        # Elapsed months strictly <= planned_duration_months
        # Distribute snapshot observation points across the project's monitoring lifecycle
        max_possible_elapsed = min(planned_duration_months, actual_duration_months)
        if max_possible_elapsed < num_snaps:
            num_snaps = max(3, max_possible_elapsed)

        elapsed_points = sorted(np.random.choice(
            np.arange(1, max_possible_elapsed + 1),
            size=num_snaps,
            replace=False
        ))

        prev_phys = 0.0
        prev_fin = 0.0
        prev_del_milestones = 0

        for s_idx, elapsed_m in enumerate(elapsed_points):
            # Calculate snapshot calendar month accurately by adding integer months
            total_months = (start_year * 12) + (start_month - 1) + elapsed_m
            snap_year = total_months // 12
            snap_mon = (total_months % 12) + 1
            snapshot_month = f"{snap_year:04d}-{snap_mon:02d}"

            # Timeline fraction completed at snapshot relative to planned duration
            time_fraction = elapsed_m / planned_duration_months

            # Archetype progress trajectory modeling
            if archetype == "healthy":
                # Smooth S-curve, on or slightly ahead of schedule
                ideal_progress = (1 / (1 + np.exp(-6 * (time_fraction - 0.45)))) * 100
                phys_target = ideal_progress * np.random.uniform(0.95, 1.05)
                fin_target = phys_target * np.random.uniform(0.94, 1.04)
                delayed_milestones = 1 if (np.random.rand() < 0.20 and s_idx > 2) else 0

            elif archetype == "delayed":
                # Physical progress lagging behind elapsed time
                ideal_progress = (1 / (1 + np.exp(-5 * (time_fraction - 0.60)))) * 100
                phys_target = ideal_progress * np.random.uniform(0.70, 0.88)
                fin_target = phys_target * np.random.uniform(1.05, 1.20)
                # Milestones delayed accumulating
                max_sched_milestones = max(1, int(milestones_total * time_fraction))
                delayed_milestones = min(max_sched_milestones, max(1, int(max_sched_milestones * np.random.uniform(0.35, 0.65))))

            elif archetype == "cost_pressure":
                # Physical progress moderate, but financial burn running hot
                ideal_progress = (1 / (1 + np.exp(-5.5 * (time_fraction - 0.50)))) * 100
                phys_target = ideal_progress * np.random.uniform(0.85, 0.98)
                fin_target = phys_target * np.random.uniform(1.20, 1.45)
                max_sched_milestones = max(1, int(milestones_total * time_fraction))
                delayed_milestones = min(max_sched_milestones, int(max_sched_milestones * np.random.uniform(0.15, 0.35)))

            elif archetype == "high_risk":
                # Severe lag in physical progress, very high financial expenditure, heavy milestone slippage
                ideal_progress = (1 / (1 + np.exp(-4.5 * (time_fraction - 0.68)))) * 100
                phys_target = ideal_progress * np.random.uniform(0.55, 0.78)
                fin_target = phys_target * np.random.uniform(1.30, 1.65)
                max_sched_milestones = max(1, int(milestones_total * time_fraction))
                delayed_milestones = min(max_sched_milestones, max(2, int(max_sched_milestones * np.random.uniform(0.45, 0.85))))

            else:  # mixed_risk
                ideal_progress = (1 / (1 + np.exp(-5 * (time_fraction - 0.55)))) * 100
                stagnation_factor = 0.80 if (3 <= s_idx <= 6) else 1.0
                phys_target = ideal_progress * stagnation_factor * np.random.uniform(0.75, 0.95)
                fin_target = phys_target * np.random.uniform(0.95, 1.25)
                max_sched_milestones = max(1, int(milestones_total * time_fraction))
                delayed_milestones = min(max_sched_milestones, int(max_sched_milestones * np.random.uniform(0.20, 0.50)))

            # Guarantee monotonic non-decreasing progress
            phys_pct = round(float(np.clip(max(prev_phys, phys_target), 0.0, 100.0)), 2)
            fin_pct = round(float(np.clip(max(prev_fin, fin_target), 0.0, 100.0)), 2)
            prev_phys = phys_pct
            prev_fin = fin_pct

            # Milestone monotonicity (delays don't jump erratically backwards)
            delayed_milestones = int(np.clip(max(prev_del_milestones - 1, delayed_milestones), 0, milestones_total))
            prev_del_milestones = delayed_milestones

            # Expenditure calculation: proportion of final cost realized so far, bounded strictly <= final_cost_cr
            # Based on financial progress and cost escalation
            expenditure_est = round(float(final_cost_cr * (fin_pct / 100.0) * np.random.uniform(0.97, 1.01)), 2)
            expenditure_cr = float(np.clip(expenditure_est, 0.0, final_cost_cr))

            # Operational status indicator
            delay_ratio = delayed_milestones / max(1, milestones_total)
            progress_deficit = (time_fraction * 100) - phys_pct

            if delay_ratio >= 0.40 or progress_deficit > 28:
                project_status = "Critical"
            elif delay_ratio >= 0.20 or progress_deficit > 14:
                project_status = "Delayed"
            else:
                project_status = "Ongoing"

            row = {
                "project_id": project_id,
                "snapshot_month": snapshot_month,
                "ministry": ministry,
                "sector": sector,
                "implementing_agency": implementing_agency,
                "state": state,
                "original_cost_cr": original_cost_cr,
                "planned_duration_months": planned_duration_months,
                "elapsed_months": elapsed_m,
                "physical_progress_pct": phys_pct,
                "financial_progress_pct": fin_pct,
                "expenditure_cr": round(expenditure_cr, 2),
                "milestones_total": milestones_total,
                "milestones_delayed": delayed_milestones,
                "project_status": project_status,
                # Future Outcome Fields (Labels / Post-completion ground truth)
                "final_cost_cr": final_cost_cr,
                "actual_duration_months": actual_duration_months,
                "cost_overrun": cost_overrun,
                "time_overrun": time_overrun,
            }
            all_rows.append(row)

    df = pd.DataFrame(all_rows)

    # Sort deterministically by project_id and elapsed_months
    df.sort_values(by=["project_id", "elapsed_months"], inplace=True)
    df.reset_index(drop=True, inplace=True)

    # Save to disk
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} snapshots for {df['project_id'].nunique()} unique projects.")
    print(f"Saved to: {output_path}")

    return df


if __name__ == "__main__":
    df = generate_synthetic_dataset()
    print("\n--- Summary Statistics ---")
    print(f"Total Rows              : {len(df)}")
    print(f"Unique Projects         : {df['project_id'].nunique()}")
    print(f"Average Snaps / Project : {len(df) / df['project_id'].nunique():.2f}")
    print(f"Cost Overrun Rate       : {df['cost_overrun'].mean() * 100:.1f}%")
    print(f"Time Overrun Rate       : {df['time_overrun'].mean() * 100:.1f}%")
    print("\nProject Status Breakdown:")
    print(df["project_status"].value_counts(normalize=True).round(3) * 100)
