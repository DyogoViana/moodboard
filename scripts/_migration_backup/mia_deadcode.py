from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

print("=" * 70)
print("MIA :: DEAD CODE")
print(ROOT)
print("=" * 70)

# ==========================================================
# Arquivos
# ==========================================================

html = (ROOT / "index.html").read_text(encoding="utf-8")

css = ""

css_dir = ROOT / "css"
if css_dir.exists():
    for f in sorted(css_dir.rglob("*.css")):
        css += "\n"
        css += f.read_text(encoding="utf-8", errors="ignore")

js = ""

for f in sorted((ROOT / "js").rglob("*.js")):
    js += "\n"
    js += f.read_text(encoding="utf-8", errors="ignore")

# ==========================================================
# Classes HTML
# ==========================================================

html_classes = set()

for c in re.findall(r'class="([^"]+)"', html):
    for item in c.split():
        html_classes.add(item)

# ==========================================================
# Classes CSS
# ==========================================================

css_classes = set(
    re.findall(r'\.([A-Za-z0-9_-]+)', css)
)

# ==========================================================
# Classes usadas no JS
# ==========================================================

js_classes = set()

js_classes.update(
    re.findall(
        r'classList\.(?:add|remove|toggle|contains)\(\s*[\'"]([^\'"]+)',
        js,
    )
)

js_classes.update(
    re.findall(
        r'\.className\s*=\s*[\'"]([^\'"]+)',
        js,
    )
)

# ==========================================================
# Funções
# ==========================================================

declared = set(
    re.findall(
        r'function\s+([A-Za-z0-9_]+)\s*\(',
        js,
    )
)

calls = set(
    re.findall(
        r'([A-Za-z0-9_]+)\s*\(',
        js,
    )
)

dead_functions = sorted(
    f for f in declared
    if f not in calls - {f}
)

unused_css = sorted(
    c for c in css_classes
    if c not in html_classes
    and c not in js_classes
)

print()

print("Classes HTML...........", len(html_classes))
print("Classes CSS............", len(css_classes))
print("Classes JS.............", len(js_classes))
print("Funções................", len(declared))

print()

if unused_css:
    print("Classes CSS aparentemente mortas:")
    for c in unused_css:
        print("  ", c)

print()

if dead_functions:
    print("Funções aparentemente nunca chamadas:")
    for f in dead_functions:
        print("  ", f)

print()

print("=" * 70)