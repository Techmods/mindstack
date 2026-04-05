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

## GitHub Pages

1. Repo Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` + Folder: `/ (root)`

Die Datei `.nojekyll` sorgt dafür, dass GitHub Pages den Inhalt 1:1 ausliefert.
