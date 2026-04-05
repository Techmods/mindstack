# MindStack Cheatsheet (Static)

Dieses Repo generiert aus `CHEATSHEET.md` eine statische, responsive Multi-Page-Seite
mit Navigation, Suche, Inhaltsverzeichnis und Copy-Buttons pro Befehl.

## Nutzung

```bash
npm install
npm run build
```

Danach liegen die fertigen Seiten als `index.html` plus eine Seite pro H2-Abschnitt
im Root. Zusätzlich wird `search-index.json` erzeugt.

## Auto-Build bei Änderungen (Copilot-freundlich)

Für “änderung → sofort neu bauen” nutze:

```bash
npm run dev
```

Das beobachtet `CHEATSHEET.md` und startet automatisch `npm run build`.
So kann GitHub Copilot (oder dein Workflow) Änderungen sofort als HTML sehen.

## Awesome Copilot (optional)

Das Repo [github/awesome-copilot] bietet eine kuratierte Sammlung von Agents,
Instructions, Skills, Hooks, Plugins und **Agentic Workflows** (Markdown-basierte
Automations). Wir haben deshalb zusätzlich eine Workflow-Definition unter
`workflows/cheatsheet-auto-build.md` abgelegt, falls du Copilot-Workflows nutzt.

Install-Hinweis (aus der Doku):

```bash
copilot plugin marketplace add github/awesome-copilot
copilot plugin install <plugin-name>@awesome-copilot
```

## .env Beispiel

Die Datei `.env` ist lokal (nicht im Repo). Beispiel:

```
.env.example
```

## GitHub Pages

1. Repo Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` + Folder: `/ (root)`

Die Datei `.nojekyll` sorgt dafür, dass GitHub Pages den Inhalt 1:1 ausliefert.
