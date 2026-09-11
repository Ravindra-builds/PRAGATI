"""
Environment and Dependency Verification Script.
Validates the Python ML virtual environment and installed libraries.
"""

import sys
import platform
from pathlib import Path


def main():
    print("=" * 60)
    print("SIH 2026 ML Environment Verification")
    print("=" * 60)

    # 1. Python version & runtime
    print(f"Python Executable : {sys.executable}")
    print(f"Python Version    : {platform.python_version()}")
    print(f"OS Platform       : {platform.system()} {platform.release()}")
    print("-" * 60)

    # 2. Package imports & versions
    errors = []

    try:
        import pandas as pd
        print(f"pandas            : {pd.__version__}")
    except ImportError as e:
        errors.append(f"pandas: {e}")

    try:
        import numpy as np
        print(f"numpy             : {np.__version__}")
    except ImportError as e:
        errors.append(f"numpy: {e}")

    try:
        import sklearn
        print(f"scikit-learn      : {sklearn.__version__}")
    except ImportError as e:
        errors.append(f"scikit-learn: {e}")

    try:
        import matplotlib
        print(f"matplotlib        : {matplotlib.__version__}")
    except ImportError as e:
        errors.append(f"matplotlib: {e}")

    try:
        import seaborn as sns
        print(f"seaborn           : {sns.__version__}")
    except ImportError as e:
        errors.append(f"seaborn: {e}")

    try:
        import openpyxl
        print(f"openpyxl          : {openpyxl.__version__}")
    except ImportError as e:
        errors.append(f"openpyxl: {e}")

    try:
        import IPython
        print(f"IPython (Jupyter) : {IPython.__version__}")
    except ImportError as e:
        errors.append(f"IPython/Jupyter: {e}")

    print("-" * 60)

    # 3. Workspace structure check
    project_root = Path(__file__).resolve().parent.parent
    expected_paths = [
        project_root / "ml" / "data" / "raw",
        project_root / "ml" / "data" / "processed",
        project_root / "ml" / "data" / "synthetic",
        project_root / "ml" / "notebooks",
        project_root / "ml" / "src",
        project_root / "ml" / "models",
        project_root / "ml" / "reports" / "eda",
        project_root / "ml" / "tests",
        project_root / "ml" / "requirements.txt",
        project_root / "ml" / "README.md",
        project_root / "ml" / "DATA_DICTIONARY.md",
        project_root / "ml" / "src" / "config.py",
    ]

    all_paths_exist = True
    for path in expected_paths:
        exists = path.exists()
        status = "OK" if exists else "MISSING"
        if not exists:
            all_paths_exist = False
        print(f"Path Check [{status}]: {path.relative_to(project_root)}")

    print("=" * 60)

    if errors:
        print(f"FAILED: Encountered {len(errors)} import error(s):")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    elif not all_paths_exist:
        print("FAILED: Some expected workspace directories or files are missing.")
        sys.exit(1)
    else:
        print("SUCCESS: All packages and paths verified successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
