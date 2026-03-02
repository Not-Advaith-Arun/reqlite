import { Component, onMount } from "solid-js";
import { MainWorkspace } from "./pages/MainWorkspace";
import { UpdateCheck } from "./components/shared/UpdateCheck";
import { loadTeams } from "./stores/collections";
import { applyTheme, getStoredTheme } from "./lib/themes";
import { initAuth } from "./lib/auth";

const App: Component = () => {
  onMount(async () => {
    applyTheme(getStoredTheme());
    await loadTeams();
    await initAuth();
  });

  return (
    <>
      <UpdateCheck />
      <MainWorkspace />
    </>
  );
};

export default App;
