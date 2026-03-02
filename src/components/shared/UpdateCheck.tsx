import { Component, Show, createSignal, onMount } from "solid-js";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export const UpdateCheck: Component = () => {
  const [update, setUpdate] = createSignal<{ version: string; body: string } | null>(null);
  const [installing, setInstalling] = createSignal(false);

  onMount(async () => {
    try {
      const result = await check();
      if (result?.available) {
        setUpdate({ version: result.version, body: result.body ?? "" });
      }
    } catch (e) {
      console.error("Update check failed:", e);
    }
  });

  const install = async () => {
    setInstalling(true);
    try {
      const result = await check();
      if (result?.available) {
        await result.downloadAndInstall();
        await relaunch();
      }
    } catch (e) {
      console.error("Update install failed:", e);
      setInstalling(false);
    }
  };

  return (
    <Show when={update()}>
      {(u) => (
        <div class="update-banner">
          <span>v{u().version} available</span>
          <button class="update-btn" onClick={install} disabled={installing()}>
            {installing() ? "Installing..." : "Update & Restart"}
          </button>
          <button class="update-dismiss" onClick={() => setUpdate(null)}>
            &times;
          </button>
        </div>
      )}
    </Show>
  );
};
