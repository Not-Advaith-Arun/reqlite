import { Component, For, createSignal } from "solid-js";
import { themes, applyTheme, getStoredTheme } from "../lib/themes";

export const Settings: Component = () => {
  const [activeTheme, setActiveTheme] = createSignal(getStoredTheme());

  const selectTheme = (key: string) => {
    applyTheme(key);
    setActiveTheme(key);
  };

  return (
    <div class="settings-page">
      <div class="settings-header">
        <span class="sidebar-title">Settings</span>
      </div>

      <div class="settings-body">
        <div class="settings-card">
          <div class="settings-card-header">
            <span class="settings-card-title">Theme</span>
            <span class="settings-card-desc">Choose your color scheme</span>
          </div>
          <div class="theme-grid">
            <For each={themes}>
              {(theme) => (
                <button
                  class={`theme-card ${activeTheme() === theme.key ? "active" : ""}`}
                  onClick={() => selectTheme(theme.key)}
                >
                  <div class="theme-preview">
                    <div
                      class="theme-preview-window"
                      style={{ background: theme.colors["--bg-primary"] }}
                    >
                      <div
                        class="theme-preview-sidebar"
                        style={{ background: theme.colors["--bg-secondary"], "border-right": `1px solid ${theme.colors["--border"]}` }}
                      >
                        <div class="theme-preview-nav-dot" style={{ background: theme.colors["--text-dim"] }} />
                        <div class="theme-preview-nav-dot" style={{ background: theme.colors["--text-dim"] }} />
                        <div class="theme-preview-nav-dot" style={{ background: theme.colors["--accent"] }} />
                      </div>
                      <div class="theme-preview-content">
                        <div
                          class="theme-preview-tab-bar"
                          style={{ background: theme.colors["--bg-secondary"], "border-bottom": `1px solid ${theme.colors["--border"]}` }}
                        >
                          <div class="theme-preview-tab" style={{ background: theme.colors["--bg-primary"], "border-bottom": `2px solid ${theme.colors["--accent"]}` }}>
                            <div class="theme-preview-dot" style={{ background: theme.colors["--success"] }} />
                            <div class="theme-preview-line-sm" style={{ background: theme.colors["--text-primary"], opacity: "0.6" }} />
                          </div>
                          <div class="theme-preview-tab" style={{ background: "transparent" }}>
                            <div class="theme-preview-dot" style={{ background: theme.colors["--warning"] }} />
                            <div class="theme-preview-line-sm" style={{ background: theme.colors["--text-muted"], opacity: "0.4" }} />
                          </div>
                        </div>
                        <div class="theme-preview-body">
                          <div class="theme-preview-url-row">
                            <div class="theme-preview-method" style={{ background: theme.colors["--accent"], opacity: "0.9" }} />
                            <div
                              class="theme-preview-url-bar"
                              style={{ background: theme.colors["--bg-tertiary"], border: `1px solid ${theme.colors["--border"]}` }}
                            />
                          </div>
                          <div class="theme-preview-rows">
                            <div class="theme-preview-row" style={{ background: theme.colors["--bg-surface"] }} />
                            <div class="theme-preview-row" style={{ background: theme.colors["--bg-surface"], width: "80%" }} />
                            <div class="theme-preview-row" style={{ background: theme.colors["--bg-surface"], width: "60%" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="theme-meta">
                    <span class="theme-name">{theme.name}</span>
                    <span class="theme-desc">{theme.description}</span>
                  </div>
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-card-header">
            <span class="settings-card-title">Sync</span>
            <span class="settings-card-desc">Connect to a team server</span>
          </div>
          <div class="settings-card-body">
            <div class="form-field">
              <label class="form-label">Server URL</label>
              <input class="form-input" type="text" placeholder="http://localhost:3000" />
            </div>
            <div class="form-field">
              <label class="form-label">Team Key</label>
              <input class="form-input" type="password" placeholder="Enter team key..." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
