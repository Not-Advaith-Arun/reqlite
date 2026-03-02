import { Component, onMount } from "solid-js";
import { MainWorkspace } from "./pages/MainWorkspace";
import { loadWorkspaces } from "./stores/collections";
import { applyTheme, getStoredTheme } from "./lib/themes";

const App: Component = () => {
  onMount(async () => {
    applyTheme(getStoredTheme());
    await loadWorkspaces();
  });

  return <MainWorkspace />;
};

export default App;
