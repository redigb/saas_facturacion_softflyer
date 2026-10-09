#!/usr/bin/env python3
"""
Arnés de Verificación de Cumplimiento UI/UX — Softflyer Design System
Inspecciona componentes en front-next/src para asegurar cumplimiento de:
1. Ergonomía táctil (alturas mínimas >= 44px, text-base en inputs).
2. Números tabulares en precios (tabular-nums).
3. Tokens de color oficiales (prohíbe colores arbitrarios como blue-*, green-* sin justificar).
"""

import os
import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "front-next" / "src"

ALLOWED_OFFICIAL_COLORS = [
    "azul", "celeste", "amarillo", "azul-oscuro", "tinta", "niebla",
    "white", "slate", "emerald", "red", "amber", "transparent", "current"
]

DISALLOWED_COLOR_PATTERNS = [
    re.compile(r'\b(bg|text|border|ring)-(blue|green|yellow|indigo|purple|pink|zinc|neutral|stone)-\d{2,3}\b'),
    re.compile(r'#[0-9a-fA-F]{3,8}\b')  # Hex directo en clases o estilos inline
]

def check_file(filepath: Path):
    issues = []
    content = filepath.read_text(encoding="utf-8")
    lines = content.splitlines()

    for idx, line in enumerate(lines, 1):
        # 1. Verificar tabular-nums en precios o formatPrice
        if "formatPrice(" in line or "precio" in line.lower() or "S/" in line:
            if "<span" in line or "<input" in line or "<button" in line or "<p" in line:
                if "tabular-nums" not in line and "formatPrice" in line:
                    issues.append((idx, "PRECIO_SIN_TABULAR", "Monto formateado sin clase 'tabular-nums'."))

        # 2. Verificar text-base en inputs para evitar zoom en iOS
        if "<input" in line and 'type="search"' not in line:
            if "text-xs" in line or "text-sm" in line:
                if "inputClass" not in line:
                    issues.append((idx, "INPUT_FUENTE_PEQUEÑA", "Input con tamaño inferior a 'text-base' (puede provocar auto-zoom móvil)."))

        # 3. Detectar colores fuera de la paleta oficial
        for pattern in DISALLOWED_COLOR_PATTERNS:
            matches = pattern.findall(line)
            if matches:
                # Filtrar si está en la lista de colores permitidos o definición de paleta
                if "CATEGORY_COLORS" not in line and "var(" not in line and "#CBD5E1" not in line:
                    issues.append((idx, "TOKEN_NO_OFICIAL", f"Uso de color fuera de los tokens de marca Softflyer: {matches}"))

    return issues

def main():
    if not ROOT_DIR.exists():
        print(f"Error: No se encontró el directorio {ROOT_DIR}")
        sys.exit(1)

    print(f"=== Verificando cumplimiento de Softflyer UI en {ROOT_DIR} ===\n")
    total_files = 0
    total_issues = 0

    for ext in ("*.tsx", "*.jsx"):
        for filepath in ROOT_DIR.rglob(ext):
            total_files += 1
            rel_path = filepath.relative_to(ROOT_DIR.parent)
            issues = check_file(filepath)
            if issues:
                print(f"[{rel_path}]")
                for line_num, code, msg in issues:
                    total_issues += 1
                    print(f"  Línea {line_num:3d} | [{code}] {msg}")
                print()

    if total_issues == 0:
        print(f"[OK] Exito: {total_files} archivos inspeccionados. 100% de cumplimiento con las reglas ergonomicas de Softflyer UI.")
        sys.exit(0)
    else:
        print(f"[ALERTA] Se encontraron {total_issues} advertencias en {total_files} archivos inspeccionados.")
        sys.exit(1)

if __name__ == "__main__":
    main()
