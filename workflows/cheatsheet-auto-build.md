---
name: Cheatsheet Auto-Build
description: "Regeneriert die statischen HTML-Seiten nach Änderungen an CHEATSHEET.md"
on:
  workflow_dispatch:
engine:
  id: copilot
permissions:
  contents: write
tools:
  github:
toolsets: [default]
safe-outputs:
  add-comment:
    max: 1
---
# Cheatsheet Auto-Build Agent

Du erzeugst die statischen Seiten für dieses Repo.

## Aufgabe
1. Führe `npm ci` aus.
2. Führe `npm run build` aus.
3. Prüfe, ob sich Dateien geändert haben.
4. Wenn ja: committe die generierten HTML-Dateien und `search-index.json`.
5. Hinterlasse einen kurzen Status-Kommentar mit Ergebnis.

## Regeln
- Keine Inhalte aus `.env` oder anderen Secrets in Commits oder Kommentare schreiben.
- Commit-Message: `chore: auto-build cheatsheet`.
