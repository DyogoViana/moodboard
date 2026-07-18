from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

print("=" * 70)
print("MIA :: FLOW CHECK")
print(ROOT)
print("=" * 70)

html = (ROOT / "index.html").read_text(encoding="utf-8")

js = ""

for f in sorted((ROOT / "js").rglob("*.js")):
    js += "\n"
    js += f.read_text(encoding="utf-8", errors="ignore")

# ==========================================================
# onclick inline
# ==========================================================

onclicks = re.findall(
    r'onclick="([^"]+)"',
    html,
)

# ==========================================================
# addEventListener
# ==========================================================

listeners = re.findall(
    r'addEventListener\s*\(\s*[\'"]([^\'"]+)',
    js,
)

# ==========================================================
# IDs HTML
# ==========================================================

ids = set(
    re.findall(
        r'id="([^"]+)"',
        html,
    )
)

# ==========================================================
# getElementById
# ==========================================================

used_ids = set(
    re.findall(
        r'getElementById\(\s*[\'"]([^\'"]+)',
        js,
    )
)

# ==========================================================
# Botões HTML
# ==========================================================

buttons = re.findall(
    r'<button[^>]*id="([^"]+)"',
    html,
)

unused_buttons = sorted(
    b for b in buttons
    if b not in used_ids
)

# ==========================================================
# Export
# ==========================================================

exports = re.findall(
    r'export\s+(?:function|const|class)\s+([A-Za-z0-9_]+)',
    js,
)

imports = re.findall(
    r'import\s*\{([^}]*)\}',
    js,
)

imported = set()

for group in imports:
    for item in group.split(","):
        item = item.strip()
        if item:
            imported.add(item)

unused_exports = sorted(
    e for e in exports
    if e not in imported
)

print()

print("onclick inline.........", len(onclicks))
print("Event listeners........", len(listeners))
print("Botões HTML............", len(buttons))
print("Exports................", len(exports))
print("Imports................", len(imported))

print()

if onclicks:
    print("onclick encontrados:")
    for o in onclicks:
        print("  ", o)

print()

if unused_buttons:
    print("Botões sem uso aparente:")
    for b in unused_buttons:
        print("  ", b)

print()

if unused_exports:
    print("Exports aparentemente não utilizados:")
    for e in unused_exports:
        print("  ", e)

print()

print("=" * 70)