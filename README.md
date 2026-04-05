# MindStack Cheatsheet (Static)

Dieses Repo generiert aus `CHEATSHEET.md` eine statische, responsive HTML-Seite
mit Inhaltsverzeichnis und Copy-Buttons für Codeblöcke.

## Nutzung

```bash
npm install
npm run build
```

Danach liegt die fertige Seite als `index.html` im Root.

## GitHub Pages

1. Repo Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` + Folder: `/ (root)`

Die Datei `.nojekyll` sorgt dafür, dass GitHub Pages den Inhalt 1:1 ausliefert.
