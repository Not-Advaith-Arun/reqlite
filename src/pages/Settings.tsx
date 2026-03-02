import { Component, createSignal } from "solid-js";

export const Settings: Component = () => {
  const [theme, setTheme] = createSignal<"dark" | "light">("dark");

  const toggleTheme = () => {
    const next = theme() === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <div class="settings-page">
      <h2>Settings</h2>
      <div class="settings-section">
        <h3>Appearance</h3>
        <div class="settings-row">
          <label>Theme</label>
          <button class="btn-sm" onClick={toggleTheme}>
            {theme() === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
      </div>
      <div class="settings-section">
        <h3>Sync</h3>
        <div class="settings-row">
          <label>Server URL</label>
          <input class="settings-input" type="text" placeholder="http://localhost:3000" />
        </div>
        <div class="settings-row">
          <label>Team Key</label>
          <input class="settings-input" type="password" placeholder="Enter team key..." />
        </div>
      </div>
    </div>
  );
};
