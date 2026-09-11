"""
Exploratory Data Analysis (EDA) Script for PAIMANA-Style Project Monitoring.

Loads the dataset, calculates descriptive statistics, distribution metrics,
target balance, and cross-feature relationships, and generates 9 high-resolution
publication-quality figures saved into ml/reports/eda/figures/.
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns

# Add ml/src to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import config


def run_exploratory_data_analysis():
    data_path = config.get_active_dataset_path()
    output_dir = config.EDA_PLOTS_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 65)
    print("Executing Exploratory Data Analysis (EDA)")
    print(f"Reading dataset: {data_path}")
    print(f"Output figures directory: {output_dir}")
    print("=" * 65)

    df = pd.read_csv(data_path)

    # Set general style
    sns.set_theme(style="whitegrid", font_scale=1.05)
    plt.rcParams.update({"figure.autolayout": True})

    # -------------------------------------------------------------
    # 1. Dataset Dimensions & Basic Stats
    # -------------------------------------------------------------
    n_rows = len(df)
    n_projects = df["project_id"].nunique()
    snaps_per_proj = df.groupby("project_id").size()

    print(f"Total Snapshots (Rows)   : {n_rows}")
    print(f"Unique Projects          : {n_projects}")
    print(f"Snapshots per Project    : Min={snaps_per_proj.min()}, Mean={snaps_per_proj.mean():.2f}, Max={snaps_per_proj.max()}")
    print(f"Columns ({len(df.columns)})        : {list(df.columns)}")

    # Missing values
    missing = df.isnull().sum()
    print("\nMissing Values Count:")
    print(missing[missing > 0] if (missing > 0).any() else "No missing values found in any column.")

    # Target counts
    cost_counts = df["cost_overrun"].value_counts()
    time_counts = df["time_overrun"].value_counts()
    print(f"\nCost Overrun Balance  : 0={cost_counts.get(0, 0)} ({cost_counts.get(0, 0)/n_rows*100:.1f}%), 1={cost_counts.get(1, 0)} ({cost_counts.get(1, 0)/n_rows*100:.1f}%)")
    print(f"Time Overrun Balance  : 0={time_counts.get(0, 0)} ({time_counts.get(0, 0)/n_rows*100:.1f}%), 1={time_counts.get(1, 0)} ({time_counts.get(1, 0)/n_rows*100:.1f}%)")

    # -------------------------------------------------------------
    # Figure 1: Cost Distribution
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 5))
    sns.histplot(df["original_cost_cr"], kde=True, log_scale=True, color="#1f77b4", ax=ax)
    ax.set_title("Distribution of Original Project Cost (Log Scale)", fontsize=13, fontweight="bold")
    ax.set_xlabel("Original Sanctioned Cost (₹ Crores, Log Scale)")
    ax.set_ylabel("Snapshot Count")
    median_cost = df['original_cost_cr'].median()
    ax.axvline(median_cost, color="red", linestyle="--", label=f"Median: ₹{median_cost:.1f} Cr")
    ax.legend()
    fig.savefig(output_dir / "01_cost_distribution.png", dpi=300)
    plt.close(fig)
    print("Saved: 01_cost_distribution.png")

    # -------------------------------------------------------------
    # Figure 2: Duration Distribution (Planned vs Actual)
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 5))
    sns.histplot(df["planned_duration_months"], kde=True, color="#2ca02c", alpha=0.5, label="Planned Duration", ax=ax)
    sns.histplot(df["actual_duration_months"], kde=True, color="#d62728", alpha=0.5, label="Actual Duration", ax=ax)
    ax.set_title("Planned vs. Actual Project Duration Distribution", fontsize=13, fontweight="bold")
    ax.set_xlabel("Duration (Months)")
    ax.set_ylabel("Snapshot Count")
    ax.legend()
    fig.savefig(output_dir / "02_duration_distribution.png", dpi=300)
    plt.close(fig)
    print("Saved: 02_duration_distribution.png")

    # -------------------------------------------------------------
    # Figure 3: Physical vs Financial Progress Scatter
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 6))
    sample_df = df.sample(min(2000, len(df)), random_state=42)
    sns.scatterplot(
        data=sample_df,
        x="physical_progress_pct",
        y="financial_progress_pct",
        hue="cost_overrun",
        palette={0: "#2ca02c", 1: "#d62728"},
        alpha=0.6,
        s=30,
        ax=ax,
    )
    ax.plot([0, 100], [0, 100], "--", color="gray", label="1:1 Parity Line")
    ax.set_title("Physical Progress vs. Financial Progress (Colored by Cost Overrun)", fontsize=13, fontweight="bold")
    ax.set_xlabel("Physical Progress (%)")
    ax.set_ylabel("Financial Progress (%)")
    ax.legend(title="Cost Overrun", labels=["Overrun (1)", "Within Budget (0)", "Parity Line"])
    fig.savefig(output_dir / "03_physical_vs_financial_progress.png", dpi=300)
    plt.close(fig)
    print("Saved: 03_physical_vs_financial_progress.png")

    # -------------------------------------------------------------
    # Figure 4: Milestone Delays by Project Status
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 5))
    order = ["Ongoing", "Delayed", "Critical"]
    sns.boxplot(data=df, x="project_status", y="milestones_delayed", hue="project_status", order=order, palette="Set2", legend=False, ax=ax)
    ax.set_title("Milestone Delays Grouped by Operational Project Status", fontsize=13, fontweight="bold")
    ax.set_xlabel("Operational Status at Snapshot")
    ax.set_ylabel("Milestones Delayed (Count)")
    fig.savefig(output_dir / "04_milestone_delays_by_status.png", dpi=300)
    plt.close(fig)
    print("Saved: 04_milestone_delays_by_status.png")

    # -------------------------------------------------------------
    # Figure 5: Sample Project Progress Over Time Trajectories
    # -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(9, 5))
    sample_projs = df["project_id"].drop_duplicates().sample(5, random_state=101).values
    palette = sns.color_palette("tab10", n_colors=len(sample_projs))

    for idx, pid in enumerate(sample_projs):
        p_data = df[df["project_id"] == pid].sort_values("elapsed_months")
        overrun_flag = "Overrun" if (p_data["time_overrun"].iloc[0] == 1 or p_data["cost_overrun"].iloc[0] == 1) else "Healthy"
        ax.plot(
            p_data["elapsed_months"],
            p_data["physical_progress_pct"],
            marker="o",
            color=palette[idx],
            label=f"{pid} ({overrun_flag})",
            linewidth=2,
        )

    ax.set_title("Multi-Snapshot Trajectories of 5 Sample Projects", fontsize=13, fontweight="bold")
    ax.set_xlabel("Elapsed Months")
    ax.set_ylabel("Physical Progress (%)")
    ax.legend(title="Project ID & Outcome", loc="upper left")
    fig.savefig(output_dir / "05_sample_project_trajectories.png", dpi=300)
    plt.close(fig)
    print("Saved: 05_sample_project_trajectories.png")

    # -------------------------------------------------------------
    # Figure 6: Target Class Distribution
    # -------------------------------------------------------------
    fig, axes = plt.subplots(1, 2, figsize=(10, 4.5))

    cost_pcts = df["cost_overrun"].value_counts(normalize=True) * 100
    axes[0].bar(["0 (Normal)", "1 (Overrun)"], [cost_pcts.get(0, 0), cost_pcts.get(1, 0)], color=["#2ca02c", "#d62728"])
    axes[0].set_title("Cost Overrun Label Balance", fontweight="bold")
    axes[0].set_ylabel("Percentage (%)")
    for i, v in enumerate([cost_pcts.get(0, 0), cost_pcts.get(1, 0)]):
        axes[0].text(i, v + 1.5, f"{v:.1f}%", ha="center", fontweight="bold")
    axes[0].set_ylim(0, 80)

    time_pcts = df["time_overrun"].value_counts(normalize=True) * 100
    axes[1].bar(["0 (Normal)", "1 (Overrun)"], [time_pcts.get(0, 0), time_pcts.get(1, 0)], color=["#1f77b4", "#ff7f0e"])
    axes[1].set_title("Time Overrun Label Balance", fontweight="bold")
    axes[1].set_ylabel("Percentage (%)")
    for i, v in enumerate([time_pcts.get(0, 0), time_pcts.get(1, 0)]):
        axes[1].text(i, v + 1.5, f"{v:.1f}%", ha="center", fontweight="bold")
    axes[1].set_ylim(0, 80)

    fig.suptitle("Supervised Target Label Balance (Binary Classification)", fontsize=13, fontweight="bold", y=1.02)
    fig.savefig(output_dir / "06_target_class_balance.png", dpi=300)
    plt.close(fig)
    print("Saved: 06_target_class_balance.png")

    # -------------------------------------------------------------
    # Figure 7: Sector Distribution & Overrun Incidence
    # -------------------------------------------------------------
    sector_summary = df.groupby("sector").agg(
        total_snapshots=("project_id", "count"),
        cost_overrun_rate=("cost_overrun", "mean"),
        time_overrun_rate=("time_overrun", "mean"),
    ).reset_index()

    fig, ax1 = plt.subplots(figsize=(10, 5))
    x = np.arange(len(sector_summary))
    width = 0.35

    ax1.bar(x - width/2, sector_summary["cost_overrun_rate"] * 100, width, label="Cost Overrun %", color="#d62728")
    ax1.bar(x + width/2, sector_summary["time_overrun_rate"] * 100, width, label="Time Overrun %", color="#ff7f0e")

    ax1.set_xticks(x)
    ax1.set_xticklabels(sector_summary["sector"], rotation=25, ha="right")
    ax1.set_title("Overrun Incidence Across Infrastructure Sectors", fontsize=13, fontweight="bold")
    ax1.set_ylabel("Overrun Rate (%)")
    ax1.set_ylim(0, 80)
    ax1.legend()
    fig.savefig(output_dir / "07_sector_overrun_rates.png", dpi=300)
    plt.close(fig)
    print("Saved: 07_sector_overrun_rates.png")

    # -------------------------------------------------------------
    # Figure 8: Risk Signals vs Overrun Outcomes
    # -------------------------------------------------------------
    df["progress_gap"] = df["financial_progress_pct"] - df["physical_progress_pct"]
    df["schedule_utilization"] = (df["elapsed_months"] / df["planned_duration_months"]) * 100

    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))

    sns.boxplot(
        data=df,
        x="cost_overrun",
        y="progress_gap",
        hue="cost_overrun",
        palette={0: "#2ca02c", 1: "#d62728", "0": "#2ca02c", "1": "#d62728"},
        legend=False,
        ax=axes[0],
    )
    axes[0].set_title("Progress Gap (Fin% - Phys%) by Cost Overrun", fontweight="bold")
    axes[0].set_xlabel("Cost Overrun (0 = No, 1 = Yes)")
    axes[0].set_ylabel("Progress Gap (Percentage Points)")

    sns.boxplot(
        data=df,
        x="time_overrun",
        y="milestones_delayed",
        hue="time_overrun",
        palette={0: "#1f77b4", 1: "#ff7f0e", "0": "#1f77b4", "1": "#ff7f0e"},
        legend=False,
        ax=axes[1],
    )
    axes[1].set_title("Delayed Milestones by Time Overrun", fontweight="bold")
    axes[1].set_xlabel("Time Overrun (0 = No, 1 = Yes)")
    axes[1].set_ylabel("Milestones Delayed (Count)")

    fig.savefig(output_dir / "08_risk_signals_vs_overrun.png", dpi=300)
    plt.close(fig)
    print("Saved: 08_risk_signals_vs_overrun.png")

    # -------------------------------------------------------------
    # Figure 9: Correlation Heatmap
    # -------------------------------------------------------------
    numeric_cols = [
        "original_cost_cr",
        "planned_duration_months",
        "elapsed_months",
        "physical_progress_pct",
        "financial_progress_pct",
        "expenditure_cr",
        "milestones_total",
        "milestones_delayed",
        "cost_overrun",
        "time_overrun",
    ]
    corr = df[numeric_cols].corr()

    fig, ax = plt.subplots(figsize=(9, 7))
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", cbar=True, ax=ax, vmin=-1, vmax=1)
    ax.set_title("Correlation Heatmap of Key Numerical Features and Targets", fontsize=13, fontweight="bold")
    fig.savefig(output_dir / "09_correlation_heatmap.png", dpi=300)
    plt.close(fig)
    print("Saved: 09_correlation_heatmap.png")

    print("\nEDA Completed Successfully. All 9 plots saved to:", output_dir)


if __name__ == "__main__":
    run_exploratory_data_analysis()
