(function initThemeToggle() {
  const BRAND_LOGO_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.75 6.25C4.75 5.42 5.42 4.75 6.25 4.75H10.4C11.52 4.75 12.47 5.16 13.1 5.82V18.34C12.49 17.92 11.63 17.65 10.63 17.65H6.25C5.42 17.65 4.75 16.98 4.75 16.15V6.25Z" fill="white"/><path d="M19.25 6.25C19.25 5.42 18.58 4.75 17.75 4.75H13.6C12.48 4.75 11.53 5.16 10.9 5.82V18.34C11.51 17.92 12.37 17.65 13.37 17.65H17.75C18.58 17.65 19.25 16.98 19.25 16.15V6.25Z" fill="#DDE6FF"/><path d="M12 6.1V18.55" stroke="#C7D2FE" stroke-width="1.4" stroke-linecap="round"/></svg>';
  const KEY = "learnix-theme";

  function normalizeBrandLogos() {
    document.querySelectorAll(".logo").forEach((logo) => {
      logo.classList.add("brand-logo");
      logo.setAttribute("aria-label", "Learnix Home");
      logo.innerHTML = `
        <span class="logo-icon" aria-hidden="true">${BRAND_LOGO_ICON}</span>
        <span class="logo-text">Learnix</span>
      `;
    });
  }

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
    const actions = document.querySelector(".nav-actions");
    if (actions) { actions.prepend(btn); return; }
    btn.classList.add("theme-toggle-floating");
    document.body.appendChild(btn);
  }

  normalizeBrandLogos();
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
