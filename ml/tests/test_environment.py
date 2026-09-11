"""
Unit tests to ensure environment readiness and configuration integrity.
"""

import sys
import unittest
from pathlib import Path


class TestMLEnvironment(unittest.TestCase):
    def test_imports(self):
        """Test that all required core libraries can be imported."""
        import pandas as pd
        import numpy as np
        import sklearn
        import matplotlib
        import seaborn
        import openpyxl

        self.assertIsNotNone(pd.__version__)
        self.assertIsNotNone(np.__version__)
        self.assertIsNotNone(sklearn.__version__)
        self.assertIsNotNone(matplotlib.__version__)
        self.assertIsNotNone(seaborn.__version__)
        self.assertIsNotNone(openpyxl.__version__)

    def test_config_paths(self):
        """Test that ml/src/config.py exports valid, resolvable paths."""
        # Ensure ml/src is in sys.path
        current_dir = Path(__file__).resolve().parent
        src_dir = current_dir.parent / "src"
        if str(src_dir) not in sys.path:
            sys.path.insert(0, str(src_dir))

        import config

        self.assertEqual(config.RANDOM_SEED, 42)
        self.assertTrue(config.DATA_RAW_DIR.exists())
        self.assertTrue(config.DATA_PROCESSED_DIR.exists())
        self.assertTrue(config.DATA_SYNTHETIC_DIR.exists())
        self.assertTrue(config.MODELS_DIR.exists())

        # Test active dataset path resolver
        synthetic_path = config.get_active_dataset_path("synthetic")
        self.assertEqual(synthetic_path.name, "synthetic_paimana_projects.csv")

        public_path = config.get_active_dataset_path("public")
        self.assertEqual(public_path.name, "public_paimana_projects.csv")


if __name__ == "__main__":
    unittest.main()
