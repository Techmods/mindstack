const copyButtons = () => {
  const blocks = document.querySelectorAll("pre > code");
  blocks.forEach((code) => {
    const pre = code.parentElement;
    if (!pre || pre.querySelector(".copy-btn")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-btn";
    button.textContent = "Kopieren";
    button.setAttribute("aria-label", "Codeblock kopieren");

    button.addEventListener("click", async () => {
      const text = code.innerText;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "absolute";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          textarea.remove();
        }
        button.classList.add("is-copied");
        const original = button.textContent;
        button.textContent = "Kopiert";
        window.setTimeout(() => {
          button.textContent = original;
          button.classList.remove("is-copied");
        }, 1600);
      } catch (error) {
        console.error("Copy failed", error);
      }
    });

    pre.appendChild(button);
  });
};

const applyLayoutMode = (mode) => {
  document.body.classList.toggle("layout-wide", mode === "wide");
  document.body.classList.toggle("layout-centered", mode !== "wide");
  const button = document.getElementById("layout-toggle");
  if (button) {
    button.textContent = mode === "wide" ? "Layout: Vollbreite" : "Layout: Zentriert";
  }
};

const setupLayoutToggle = () => {
  const button = document.getElementById("layout-toggle");
  if (!button) return;
  const stored = localStorage.getItem("layoutMode") || "center";
  applyLayoutMode(stored);
  button.addEventListener("click", () => {
    const next = document.body.classList.contains("layout-wide") ? "center" : "wide";
    localStorage.setItem("layoutMode", next);
    applyLayoutMode(next);
  });
};

const setupSearch = async () => {
  const input = document.getElementById("global-search");
  const resultsBox = document.getElementById("search-results");
  if (!input || !resultsBox) return;

  let index = [];
  try {
    const resp = await fetch("search-index.json");
    if (resp.ok) index = await resp.json();
  } catch (error) {
    console.error("Search index not available", error);
  }

  const renderResults = (items) => {
    if (!items.length) {
      resultsBox.classList.remove("is-open");
      resultsBox.innerHTML = "";
      return;
    }
    resultsBox.innerHTML = items
      .map(
        (item) =>
          `<a class="search-result" href="${item.url}">
            ${item.title}
            <span>${item.snippet || ""}</span>
          </a>`
      )
      .join("");
    resultsBox.classList.add("is-open");
  };

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      renderResults([]);
      return;
    }
    const matches = index
      .filter((item) => {
        const snippet = (item.snippet || "").toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.pageTitle.toLowerCase().includes(query) ||
          snippet.includes(query)
        );
      })
      .slice(0, 20);
    renderResults(matches);
  });

  document.addEventListener("click", (event) => {
    if (!resultsBox.contains(event.target) && event.target !== input) {
      resultsBox.classList.remove("is-open");
    }
  });
};

const setupTocFilter = () => {
  const filterInputs = [
    document.getElementById("toc-filter"),
    document.getElementById("toc-filter-mobile"),
  ].filter(Boolean);
  if (!filterInputs.length) return;

  filterInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const value = input.value.trim().toLowerCase();
      document.querySelectorAll(".toc-item").forEach((item) => {
        const text = item.textContent.toLowerCase();
        item.style.display = !value || text.includes(value) ? "" : "none";
      });
    });
  });
};

document.addEventListener("DOMContentLoaded", () => {
  copyButtons();
  setupLayoutToggle();
  setupSearch();
  setupTocFilter();
});
