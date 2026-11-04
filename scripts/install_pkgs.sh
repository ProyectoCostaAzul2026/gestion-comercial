#!/bin/bash
# Instala las dependencias de npm al iniciar una sesión de Claude Code en la nube (hook SessionStart de
# .claude/settings.json). En las sesiones locales sale de inmediato: CLAUDE_CODE_REMOTE solo vale "true" en la nube.

if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 1
hashes=node_modules/.install_pkgs.sha256

# Se salta la instalación mientras package.json, package-lock.json y este script no cambien.
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  # Primero se borra la huella anterior, para que una instalación fallida se repita la próxima vez
  rm -f "$hashes"
  if npm ci --no-audit --no-fund || npm install --no-audit --no-fund; then
    sha256sum scripts/install_pkgs.sh package.json package-lock.json > "$hashes" || rm -f "$hashes"
  fi
fi

exit 0
