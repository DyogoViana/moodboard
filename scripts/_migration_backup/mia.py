#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
===============================================================================
MIA — Moodboard Intelligence Auditor
Version : 0.1.0-bootstrap
Author  : Pandora Project
Python  : 3.11+
===============================================================================

Bootstrap do sistema.

Objetivos desta versão:

- localizar automaticamente a raiz do projeto
- validar a estrutura mínima
- criar reports/
- inventariar diretórios principais
- gerar bootstrap.json
- gerar bootstrap.md

Somente biblioteca padrão.

NOTA DE CORREÇÃO (aplicada por Minerva, 18/07/2026):
- Corrigido IndentationError: `def main()` estava aninhado dentro do
  método `write_markdown()` da classe BootstrapReport, em vez de ser
  uma função de módulo separada.
- `argparse` é importado mas NUNCA foi utilizado nesta versão — os
  parâmetros --root/--reports-dir/--audit/--json/--markdown/--verbose
  não têm efeito algum. Não implementei um parser novo aqui para não
  mudar o comportamento sem sua decisão explícita; ver aviso no final
  do arquivo.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import logging
import os
from pathlib import Path
import platform
import shutil
import socket
import sys
import time
from typing import Any, Dict, Iterable, List, Optional

# =============================================================================
# CONSTANTES
# =============================================================================

APP_NAME = "MIA"
VERSION = "0.1.0"
REPORT_FOLDER = "reports"

ROOT_MARKERS = (
    ".git",
    "pyproject.toml",
    "package.json",
    "requirements.txt",
    "README.md",
)

IGNORE_DIRS = {
    ".git",
    ".idea",
    ".vscode",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".next",
    ".nuxt",
    "node_modules",
    "dist",
    "build",
    REPORT_FOLDER,
}

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(message)s"

# =============================================================================
# LOGGER
# =============================================================================


def configure_logger() -> logging.Logger:
    logger = logging.getLogger(APP_NAME)

    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT))

    logger.addHandler(handler)

    return logger


log = configure_logger()

# =============================================================================
# UTILITÁRIOS
# =============================================================================


def utc_now() -> str:
    return dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as f:
        while True:
            block = f.read(1024 * 64)
            if not block:
                break
            digest.update(block)

    return digest.hexdigest()


def format_bytes(value: int) -> str:
    size = float(value)

    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size < 1024:
            return f"{size:.2f} {unit}"
        size /= 1024

    return f"{size:.2f} PB"


# =============================================================================
# PROJECT ROOT
# =============================================================================


def has_project_marker(directory: Path) -> bool:
    for marker in ROOT_MARKERS:
        if (directory / marker).exists():
            return True

    return False


def discover_project_root(start: Optional[Path] = None) -> Path:
    current = (start or Path.cwd()).resolve()

    while True:

        if has_project_marker(current):
            return current

        if current.parent == current:
            return (start or Path.cwd()).resolve()

        current = current.parent


# =============================================================================
# FILESYSTEM
# =============================================================================


class FileSystem:

    def __init__(self, root: Path):
        self.root = root

    def reports_dir(self) -> Path:
        path = self.root / REPORT_FOLDER
        path.mkdir(parents=True, exist_ok=True)
        return path

    def relative(self, path: Path) -> str:
        try:
            return str(path.relative_to(self.root))
        except ValueError:
            return str(path)

    def iter_dirs(self) -> Iterable[Path]:

        for current, dirs, _ in os.walk(self.root):

            dirs[:] = [
                d
                for d in dirs
                if d not in IGNORE_DIRS
            ]

            yield Path(current)

    def iter_files(self) -> Iterable[Path]:

        for current, dirs, files in os.walk(self.root):

            dirs[:] = [
                d
                for d in dirs
                if d not in IGNORE_DIRS
            ]

            for file in files:
                yield Path(current) / file


# =============================================================================
# INVENTÁRIO
# =============================================================================


class Inventory:

    def __init__(self, fs: FileSystem):

        self.fs = fs

        self.directories: List[Dict[str, Any]] = []
        self.files: List[Dict[str, Any]] = []

        self.total_files = 0
        self.total_dirs = 0
        self.total_size = 0

    def scan(self) -> None:

        log.info("Escaneando diretórios...")

        for directory in self.fs.iter_dirs():

            rel = self.fs.relative(directory)

            self.directories.append(
                {
                    "path": rel,
                }
            )

        self.total_dirs = len(self.directories)

        log.info("Escaneando arquivos...")

        for file in self.fs.iter_files():

            try:
                stat = file.stat()

            except OSError:
                continue

            item = {
                "path": self.fs.relative(file),
                "extension": file.suffix.lower(),
                "size": stat.st_size,
                "modified": dt.datetime.fromtimestamp(
                    stat.st_mtime
                ).isoformat(),
            }

            self.files.append(item)

            self.total_files += 1
            self.total_size += stat.st_size


# =============================================================================
# BOOTSTRAP REPORT
# =============================================================================


class BootstrapReport:

    def __init__(self, root: Path, inventory: Inventory):

        self.root = root
        self.inventory = inventory

    def system_info(self) -> Dict[str, Any]:

        return {
            "platform": platform.system(),
            "release": platform.release(),
            "python": platform.python_version(),
            "hostname": socket.gethostname(),
            "processor": platform.processor(),
            "timestamp": utc_now(),
        }

    def summary(self) -> Dict[str, Any]:

        return {
            "application": APP_NAME,
            "version": VERSION,
            "project_root": str(self.root),
            "directories": self.inventory.total_dirs,
            "files": self.inventory.total_files,
            "size_bytes": self.inventory.total_size,
            "size_human": format_bytes(
                self.inventory.total_size
            ),
        }

    def to_dict(self) -> Dict[str, Any]:

        return {
            "summary": self.summary(),
            "system": self.system_info(),
            "directories": self.inventory.directories,
            "files": self.inventory.files,
        }

    def write_json(self, target: Path) -> None:

        with target.open(
            "w",
            encoding="utf-8",
        ) as fp:

            json.dump(
                self.to_dict(),
                fp,
                ensure_ascii=False,
                indent=4,
            )

    def write_markdown(self, target: Path) -> None:

        lines = []

        lines.append("# Bootstrap Report")
        lines.append("")
        lines.append(f"- Projeto: `{self.root}`")
        lines.append(f"- Data: {utc_now()}")
        lines.append("")
        lines.append("## Resumo")
        lines.append("")
        lines.append(f"- Diretórios: {self.inventory.total_dirs}")
        lines.append(f"- Arquivos: {self.inventory.total_files}")
        lines.append(
            f"- Tamanho: {format_bytes(self.inventory.total_size)}"
        )
        lines.append("")
        lines.append("## Diretórios")
        lines.append("")

        for directory in self.inventory.directories:
            lines.append(f"- {directory['path']}")

        target.write_text(
            "\n".join(lines),
            encoding="utf-8",
        )


# =============================================================================
# MAIN
# =============================================================================
# AVISO: --root, --reports-dir, --audit, --json, --markdown, --verbose
# não têm efeito nesta versão (0.1.0-bootstrap). O script sempre
# descobre a raiz sozinho e sempre escreve em <raiz>/reports/.
# Corrija isso formalmente antes de confiar em qualquer flag passada
# na linha de comando — hoje ela é silenciosamente ignorada.


def main() -> int:
    root = discover_project_root()

    log.info("Projeto: %s", root)

    fs = FileSystem(root)
    reports = fs.reports_dir()

    inventory = Inventory(fs)
    inventory.scan()

    report = BootstrapReport(root, inventory)

    report.write_json(reports / "bootstrap.json")
    report.write_markdown(reports / "bootstrap.md")

    log.info("bootstrap.json criado.")
    log.info("bootstrap.md criado.")
    log.info("Concluído.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())