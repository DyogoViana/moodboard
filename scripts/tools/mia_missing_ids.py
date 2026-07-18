from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "js"

targets = {
    "diag-export-btn",
    "diagnostics-badge",
    "diagnostics-panel",
}

print("=" * 70)
print("MIA :: MISSING IDS")
print("=" * 70)

for file in JS.rglob("*.js"):
    text = file.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()

    for n, line in enumerate(lines, 1):
        for target in targets:
            if target in line:
                print()
                print(file.relative_to(ROOT))
                print(f"Linha {n}")
                print(line.strip())