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

document.addEventListener("DOMContentLoaded", copyButtons);
