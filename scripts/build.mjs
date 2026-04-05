import fs from "fs";
import path from "path";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import GitHubSlugger from "github-slugger";

const root = process.cwd();
const mdPath = path.join(root, "CHEATSHEET.md");
const templatePath = path.join(root, "src", "template.html");
const outPath = path.join(root, "index.html");

if (!fs.existsSync(mdPath)) {
  console.error("CHEATSHEET.md not found.");
  process.exit(1);
}

const raw = fs.readFileSync(mdPath, "utf8");

const stripTocSection = (input) => {
  const lines = input.split(/\r?\n/);
  const out = [];
  let skipping = false;
  for (const line of lines) {
    if (!skipping && /^##\s+Inhaltsverzeichnis\b/i.test(line)) {
      skipping = true;
      continue;
    }
    if (skipping) {
      if (/^---\s*$/.test(line) || /^##\s+/.test(line)) {
        skipping = false;
        if (!/^---\s*$/.test(line)) out.push(line);
      }
      continue;
    }
    out.push(line);
  }
  return out.join("\n").trim() + "\n";
};

const cleaned = stripTocSection(raw);

const extractTitle = (input) => {
  const match = input.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Cheatsheet";
};

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const mdForToc = new MarkdownIt();
const tocSlugger = new GitHubSlugger();
const tokens = mdForToc.parse(cleaned, {});
const headings = [];

for (let i = 0; i < tokens.length; i += 1) {
  const token = tokens[i];
  if (token.type === "heading_open") {
    const level = Number(token.tag.replace("h", ""));
    if (level < 2 || level > 3) continue;
    const inline = tokens[i + 1];
    if (!inline || inline.type !== "inline") continue;
    const text = inline.content.trim();
    if (!text) continue;
    const slug = tocSlugger.slug(text);
    headings.push({ level, text, slug });
  }
}

const tocHtml = headings.length
  ? `<ul class="toc-list">\n${headings
      .map(
        (h) =>
          `<li class="toc-item level-${h.level}"><a href="#${h.slug}">${escapeHtml(
            h.text
          )}</a></li>`
      )
      .join("\n")}\n</ul>`
  : `<p class="toc-empty">Keine Abschnitte gefunden.</p>`;

const renderSlugger = new GitHubSlugger();
const md = new MarkdownIt({ html: true, linkify: true, typographer: true }).use(
  anchor,
  {
    slugify: (s) => renderSlugger.slug(s),
  }
);

const content = md.render(cleaned);
const title = extractTitle(cleaned);
const template = fs.readFileSync(templatePath, "utf8");
const buildDate = new Date().toISOString().slice(0, 10);

const output = template
  .replace(/{{title}}/g, escapeHtml(title))
  .replace(/{{toc}}/g, tocHtml)
  .replace(/{{content}}/g, content)
  .replace(/{{buildDate}}/g, buildDate);

fs.writeFileSync(outPath, output, "utf8");
console.log("Built index.html");
