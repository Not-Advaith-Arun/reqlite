import { Component, Show, onMount } from "solid-js";
import { MainWorkspace } from "./pages/MainWorkspace";
import { UpdateCheck } from "./components/shared/UpdateCheck";
import { AuthCodeModal } from "./components/shared/AuthCodeModal";
import { loadTeams } from "./stores/collections";
import { applyTheme, getStoredTheme } from "./lib/themes";
import { initAuth, submitAuthCode, showCodeEntry } from "./lib/auth";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";

function handleDeepLinkUrls(urls: string[]) {
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      const code = parsed.searchParams.get("code");
      if (code) {
        submitAuthCode(code);
        return;
      }
    } catch {
      console.error("Failed to parse deep link:", url);
    }
  }
}

const App: Component = () => {
  onMount(async () => {
    applyTheme(getStoredTheme());
    await loadTeams();
    await initAuth();

    // Cold start: app was opened via deep link
    const initialUrls = await getCurrent();
    if (initialUrls?.length) {
      handleDeepLinkUrls(initialUrls);
    }

    // Warm start: app already running, receives deep link
    onOpenUrl(handleDeepLinkUrls);
  });

  return (
    <>
      <UpdateCheck />
      <MainWorkspace />
      <Show when={showCodeEntry()}>
        <AuthCodeModal />
      </Show>
    </>
  );
};

export default App;
