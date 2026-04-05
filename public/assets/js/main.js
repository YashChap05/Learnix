(function initThemeToggle() {
  const KEY = "learnix-theme";

  function getTheme() {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.body.classList.toggle("dark", theme === "dark");
    const btn = document.getElementById("themeToggleBtn");
    if (btn) btn.textContent = theme === "dark" ? "☀ Light" : "☾ Dark";
  }

  function createToggleButton() {
    if (document.getElementById("themeToggleBtn")) return;
    const btn = document.createElement("button");
    btn.id = "themeToggleBtn";
    btn.type = "button";
    btn.className = "theme-toggle-btn";
    btn.addEventListener("click", () => {
      const next = document.body.classList.contains("dark") ? "light" : "dark";
      localStorage.setItem(KEY, next);
      applyTheme(next);
    });
    btn.classList.add("theme-toggle-floating");
    document.body.appendChild(btn);
  }

  createToggleButton();
  applyTheme(getTheme());

  // Keep button alive if nav re-renders
  new MutationObserver(() => {
    if (!document.getElementById("themeToggleBtn")) {
      createToggleButton();
      applyTheme(document.body.classList.contains("dark") ? "dark" : "light");
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
