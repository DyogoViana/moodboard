from pathlib import Path
import re

# ==========================================================
# Localiza automaticamente a raiz do projeto
# ==========================================================

ROOT = Path(__file__).resolve().parent.parent

print("=" * 70)
print("MIA :: DOCTOR")
print(ROOT)
print("=" * 70)

# ==========================================================
# Arquivos
# ==========================================================

html = (ROOT / "index.html").read_text(encoding="utf-8")

js = ""

for file in sorted((ROOT / "js").rglob("*.js")):
    js += "\n"
    js += file.read_text(encoding="utf-8", errors="ignore")

# ==========================================================
# IDs HTML
# ==========================================================

html_ids = set(re.findall(r'id="([^"]+)"', html))

# ==========================================================
# getElementById
# ==========================================================

js_ids = set(
    re.findall(
        r'getElementById\(\s*[\'"]([^\'"]+)[\'"]\s*\)',
        js,
    )
)

# ==========================================================
# querySelector("#id")
# ==========================================================

query_ids = set(
    re.findall(
        r'querySelector(?:All)?\(\s*[\'"]#([^\'"]+)[\'"]',
        js,
    )
)

# ==========================================================
# element.id =
# ==========================================================

dynamic_ids = set(
    re.findall(
        r'\.id\s*=\s*[\'"]([^\'"]+)[\'"]',
        js,
    )
)

# ==========================================================
# IDs criados dentro de HTML (innerHTML/template strings)
# ==========================================================

template_ids = set(
    re.findall(
        r'id=["\']([^"\']+)["\']',
        js,
    )
)

# ==========================================================
# IDs usados
# ==========================================================

used_ids = (
    js_ids
    | query_ids
    | dynamic_ids
    | template_ids
)

# ==========================================================
# onclick
# ==========================================================

onclicks = re.findall(r'onclick\s*=', html)

# ==========================================================
# Tabs
# ==========================================================

tabs = set(re.findall(r'data-panel="([^"]+)"', html))

panels = set(re.findall(r'id="(panel-[^"]+)"', html))

# ==========================================================
# IDs aparentemente sem uso
# ==========================================================

unused = sorted(html_ids - used_ids)

# ==========================================================
# IDs inexistentes
# ==========================================================

missing = sorted(js_ids - html_ids - dynamic_ids - template_ids)

# ==========================================================
# Tabs sem painel
# ==========================================================

missing_panels = sorted(
    t for t in tabs
    if f"panel-{t}" not in panels
)

# ==========================================================
# Painéis sem tab
# ==========================================================

missing_tabs = sorted(
    p for p in panels
    if p.replace("panel-", "") not in tabs
)

# ==========================================================
# Relatório
# ==========================================================

print()

print(f"HTML IDs............... {len(html_ids)}")
print(f"JS IDs................. {len(js_ids)}")
print(f"IDs dinâmicos.......... {len(dynamic_ids)}")
print(f"Template IDs........... {len(template_ids)}")
print(f"QuerySelector IDs...... {len(query_ids)}")
print(f"Painéis................ {len(panels)}")
print(f"Tabs................... {len(tabs)}")
print(f"onclick inline......... {len(onclicks)}")

print()

if unused:
    print("IDs aparentemente sem uso:")
    for item in unused:
        print("  ", item)

print()

if missing:
    print("IDs inexistentes:")
    for item in missing:
        print("  ", item)

print()

if missing_panels:
    print("Tabs sem painel:")
    for item in missing_panels:
        print("  ", item)

print()

if missing_tabs:
    print("Painéis sem tab:")
    for item in missing_tabs:
        print("  ", item)

print()
print("=" * 70)
print("Resumo")
print("=" * 70)

print(f"IDs aparentemente órfãos : {len(unused)}")
print(f"IDs inexistentes......... {len(missing)}")
print(f"Tabs sem painel.......... {len(missing_panels)}")
print(f"Painéis sem tab.......... {len(missing_tabs)}")
print(f"onclick inline........... {len(onclicks)}")