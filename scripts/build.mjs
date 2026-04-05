import fs from "fs";
import path from "path";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import GitHubSlugger from "github-slugger";

const root = process.cwd();
const mdPath = path.join(root, "CHEATSHEET.md");
const templatePath = path.join(root, "src", "template.html");
const outIndexPath = path.join(root, "index.html");
const searchIndexPath = path.join(root, "search-index.json");

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

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const stripMarkdown = (value) =>
  value
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#+\s+/g, "")
    .replace(/>\s?/g, "")
    .trim();

const splitCodeBlocks = (input) => {
  const lines = input.split(/\r?\n/);
  const out = [];
  let inFence = false;
  let fenceLine = "";
  let buffer = [];

  const flushFence = () => {
    const content = buffer.join("\n");
    const chunks = content
      .split(/\n\s*\n/)
      .map((chunk) => chunk.replace(/\s+$/g, ""))
      .filter((chunk) => chunk.trim().length > 0);
    chunks.forEach((chunk, idx) => {
      if (idx > 0) out.push("");
      out.push(fenceLine);
      out.push(chunk);
      out.push("```");
    });
    buffer = [];
  };

  lines.forEach((line) => {
    if (line.startsWith("```")) {
      if (!inFence) {
        inFence = true;
        fenceLine = line.trim();
      } else {
        inFence = false;
        flushFence();
      }
      return;
    }
    if (inFence) {
      buffer.push(line);
    } else {
      out.push(line);
    }
  });

  if (inFence && buffer.length) {
    flushFence();
  }

  return out.join("\n").trim() + "\n";
};

const extractTitle = (input) => {
  const match = input.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Cheatsheet";
};

const extractStand = (input) => {
  const match = input.match(/Stand:\s*([^\n]+)/i);
  return match ? match[1].trim().replace(/\.$/, "") : "—";
};

const extractIntro = (input) => {
  const beforeSections = input.split(/^##\s+/m)[0] || "";
  const cleaned = beforeSections
    .replace(/^#.+$/m, "")
    .replace(/^---$/gm, "")
    .replace(/^\s*>/gm, "")
    .trim();
  const para = cleaned.split(/\n\s*\n/)[0] || "";
  return stripMarkdown(para);
};

const splitSections = (input) => {
  const lines = input.split(/\r?\n/);
  const sections = [];
  let current = null;
  lines.forEach((line) => {
    const match = line.match(/^##\s+(.+)/);
    if (match) {
      if (current) sections.push(current);
      current = { title: match[1].trim(), lines: [] };
      return;
    }
    if (current) current.lines.push(line);
  });
  if (current) sections.push(current);
  return sections.map((section) => ({
    title: section.title,
    markdown: section.lines.join("\n").trim() + "\n",
  }));
};

const buildToc = (markdown) => {
  const md = new MarkdownIt();
  const tokens = md.parse(markdown, {});
  const slugger = new GitHubSlugger();
  const headings = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === "heading_open") {
      const level = Number(token.tag.replace("h", ""));
      if (level !== 3) continue;
      const inline = tokens[i + 1];
      if (!inline || inline.type !== "inline") continue;
      const text = inline.content.trim();
      if (!text) continue;
      const slug = slugger.slug(text);
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
  return tocHtml;
};

const splitSubsections = (markdown) => {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = null;
  lines.forEach((line) => {
    const match = line.match(/^###\s+(.+)/);
    if (match) {
      if (current) sections.push(current);
      current = { title: match[1].trim(), lines: [] };
      return;
    }
    if (current) current.lines.push(line);
  });
  if (current) sections.push(current);
  return sections;
};

const mdForRender = (slugger) =>
  new MarkdownIt({ html: true, linkify: true, typographer: true }).use(anchor, {
    slugify: (s) => slugger.slug(s),
  });

const cleaned = splitCodeBlocks(stripTocSection(raw));
const siteTitle = extractTitle(cleaned);
const stand = extractStand(raw);
const introLede = extractIntro(cleaned) || "Wähle eine Umgebung aus.";

const versionPath = path.join(root, "VERSION");
const version = fs.existsSync(versionPath)
  ? fs.readFileSync(versionPath, "utf8").trim()
  : "";
const versionHtml = version ? `<span>Version: ${escapeHtml(version)}</span>` : "";

const buildDate = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date());

const sections = splitSections(cleaned);
const pageSlugger = new GitHubSlugger();

const pages = sections.map((section) => {
  const slug = pageSlugger.slug(section.title);
  const filename = `${slug}.html`;
  return { ...section, slug, filename };
});

const pageNavHtml = (current) =>
  pages
    .map((page) => {
      const active = current === page.filename ? "is-active" : "";
      return `<a href="${page.filename}" class="${active}">${escapeHtml(
        page.title
      )}</a>`;
    })
    .join("\n");

const template = fs.readFileSync(templatePath, "utf8");
const searchIndex = [];

const renderPage = ({ title, markdown, filename }) => {
  const toc = buildToc(markdown);
  const slugger = new GitHubSlugger();
  const md = mdForRender(slugger);
  const content = md.render(markdown);

  const sections = splitSubsections(markdown);
  const sectionSlugger = new GitHubSlugger();
  sections.forEach((section) => {
    const anchor = sectionSlugger.slug(section.title);
    const snippet = stripMarkdown(section.lines.join(" ")).slice(0, 140);
    searchIndex.push({
      title: section.title,
      pageTitle: title,
      snippet,
      url: `${filename}#${anchor}`,
    });
  });

  const summary = stripMarkdown(markdown).slice(0, 160);
  searchIndex.push({
    title,
    pageTitle: title,
    snippet: summary,
    url: filename,
  });

  const output = template
    .replace(/{{bodyClass}}/g, "page-section")
    .replace(/{{title}}/g, escapeHtml(title))
    .replace(/{{eyebrow}}/g, "Umgebung")
    .replace(/{{lede}}/g, escapeHtml(summary || introLede))
    .replace(/{{stand}}/g, escapeHtml(stand))
    .replace(/{{buildDate}}/g, escapeHtml(buildDate))
    .replace(/{{version}}/g, versionHtml)
    .replace(/{{pageNav}}/g, pageNavHtml(filename))
    .replace(/{{toc}}/g, toc)
    .replace(/{{tocOpen}}/g, "open")
    .replace(/{{content}}/g, content);

  fs.writeFileSync(path.join(root, filename), output, "utf8");
};

pages.forEach(renderPage);

const indexContent = pages
  .map((page) => {
    const snippet = stripMarkdown(page.markdown).slice(0, 160);
    return `<a class="page-card" href="${page.filename}">
      <h3 class="page-card-title">${escapeHtml(page.title)}</h3>
      <p class="page-card-snippet">${escapeHtml(
        snippet || "Abschnitte anzeigen"
      )}</p>
    </a>`;
  })
  .join("\n");

const indexOutput = template
  .replace(/{{bodyClass}}/g, "page-index")
  .replace(/{{title}}/g, escapeHtml(siteTitle))
  .replace(/{{eyebrow}}/g, "Startseite")
  .replace(/{{lede}}/g, escapeHtml(introLede))
  .replace(/{{stand}}/g, escapeHtml(stand))
  .replace(/{{buildDate}}/g, escapeHtml(buildDate))
  .replace(/{{version}}/g, versionHtml)
  .replace(/{{pageNav}}/g, pageNavHtml("index.html"))
  .replace(/{{toc}}/g, `<p class="toc-empty">Abschnitte siehe Seiten.</p>`)
  .replace(/{{tocOpen}}/g, "")
  .replace(/{{content}}/g, indexContent);

fs.writeFileSync(outIndexPath, indexOutput, "utf8");
fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndex, null, 2), "utf8");

console.log(`Built ${pages.length} pages + index.html`);
