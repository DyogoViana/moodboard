from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

app = (ROOT / "js" / "app.js").read_text(encoding="utf-8")

for m in re.finditer(r"panel-tree|panel-trash", app):
    ini = max(0, m.start() - 120)
    fim = min(len(app), m.end() + 120)

    print("=" * 80)
    print(app[ini:fim])