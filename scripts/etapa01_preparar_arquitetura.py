#!/usr/bin/env python3
from pathlib import Path
import shutil
import datetime
import sys

# ============================================================
# Configuração
# ============================================================

PROJECT_MARKERS = (
    "index.html",
    "package.json",
    ".git",
)

FILES = [
    "mia.py",
    "mia_deadcode.py",
    "mia_doctor.py",
    "mia_flowcheck.py",
    "mia_missing_ids.py",
    "mia_panel_audit.py",
    "mia_panel_fix.py",
]

# ============================================================

def find_project_root() -> Path:
    current = Path(__file__).resolve().parent

    while current != current.parent:
        if any((current / marker).exists() for marker in PROJECT_MARKERS):
            return current
        current = current.parent

    raise RuntimeError(
        "Não foi possível localizar a raiz do projeto "
        "(index.html, package.json ou .git)."
    )


ROOT = find_project_root()
SCRIPTS = ROOT / "scripts"
TOOLS = SCRIPTS / "tools"

TOOLS.mkdir(parents=True, exist_ok=True)

LOG = ROOT / "migration_step01.log"

moved = 0
ignored = 0
errors = 0

with LOG.open("w", encoding="utf-8", newline="\n") as f:
    def log(msg: str):
        print(msg)
        f.write(msg + "\n")

    log("=" * 70)
    log("MoodboardStudio")
    log("Migração - Etapa 01")
    log(f"Data: {datetime.datetime.now():%Y-%m-%d %H:%M:%S}")
    log(f"Projeto: {ROOT}")
    log("=" * 70)

    init = TOOLS / "__init__.py"

    if not init.exists():
        init.write_text("", encoding="utf-8")
        log("[CRIADO] scripts/tools/__init__.py")
    else:
        log("[OK] scripts/tools/__init__.py")

    for filename in FILES:

        origem = SCRIPTS / filename
        destino = TOOLS / filename

        if not origem.exists():
            log(f"[IGNORADO] {filename} não encontrado")
            ignored += 1
            continue

        if destino.exists():
            log(f"[IGNORADO] {filename} já existe")
            ignored += 1
            continue

        try:
            shutil.move(str(origem), str(destino))
            moved += 1
            log(f"[MOVIDO] {filename}")

        except Exception as exc:
            errors += 1
            log(f"[ERRO] {filename}: {exc}")

    log("")
    log("=" * 70)
    log("RESUMO")
    log("=" * 70)
    log(f"Arquivos previstos : {len(FILES)}")
    log(f"Movidos            : {moved}")
    log(f"Ignorados          : {ignored}")
    log(f"Erros              : {errors}")

    if errors == 0:
        log("\nSTATUS: OK")
        sys.exit(0)

    log("\nSTATUS: FALHOU")
    sys.exit(1)