
from pathlib import Path
import os

print(f"__file__: {__file__}")
file_path = Path(__file__)
print(f"Path(__file__): {file_path}")
print(f"Parent: {file_path.parent}")
print(f"Parent.parent: {file_path.parent.parent}")
print(f"Parent.parent.parent: {file_path.parent.parent.parent}")

interpretability_root = file_path.parent.parent.parent
db_path = interpretability_root / "resources" / "vector_db"
print(f"Calculated db_path: {db_path}")
print(f"Does db_path exist? {db_path.exists()}")
