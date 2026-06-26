import { useEffect, useState } from "react";

const KEY = "doozy_theme";

function isDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(isDark);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    localStorage.setItem(KEY, dark ? "dark" : "light");
    // Keep the browser UI chrome color in sync.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#101013" : "#fbfbfa");
  }, [dark]);

  return (
    <button
      className="icon-btn"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
