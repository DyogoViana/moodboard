from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "js" / "app.js"

code = APP.read_text(encoding="utf-8")

old = """      document.getElementById('panel-tree').classList.toggle('hidden', tab.dataset.panel !== 'tree');
      document.getElementById('panel-trash').classList.toggle('hidden', tab.dataset.panel !== 'trash');"""

new = """      document.getElementById('panel-tree').classList.toggle('hidden', tab.dataset.panel !== 'tree');
      document.getElementById('panel-trash').classList.toggle('hidden', tab.dataset.panel !== 'trash');
      document.getElementById('panel-color').classList.toggle('hidden', tab.dataset.panel !== 'color');"""

if "panel-color').classList.toggle" in code:
    print("Correção já aplicada.")
    sys.exit(0)

if old not in code:
    print("Trecho esperado não encontrado.")
    sys.exit(1)

backup = APP.with_suffix(".js.bak")
shutil.copy2(APP, backup)

code = code.replace(old, new)

APP.write_text(code, encoding="utf-8")

print("OK")
print("Backup:", backup.name)
print("panel-color adicionado.")