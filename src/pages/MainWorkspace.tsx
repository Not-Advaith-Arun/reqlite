import { Component, Show, createSignal, onMount } from "solid-js";
import { Sidebar } from "../components/layout/Sidebar";
import { TabBar } from "../components/layout/TabBar";
import { StatusBar } from "../components/layout/StatusBar";
import { RequestPanel } from "../components/request/RequestPanel";
import { ResponsePanel } from "../components/response/ResponsePanel";
import { EnvManager } from "../components/environments/EnvManager";
import { CurlImport } from "../components/import/CurlImport";
import { tabs, activeTabId, getActiveTab, updateTab, executeRequest, createNewTab, saveRequest } from "../stores/request";
import { activeWorkspace } from "../stores/collections";
import { loadEnvironments } from "../stores/environments";
import { loadHistory } from "../stores/history";
import type { Tab } from "../stores/request";

type SidePanel = "collections" | "environments" | "history";

export const MainWorkspace: Component = () => {
  const [sidePanel, setSidePanel] = createSignal<SidePanel>("collections");
  const [sidebarWidth, setSidebarWidth] = createSignal(280);
  const [showCurlImport, setShowCurlImport] = createSignal(false);
  const [splitRatio, setSplitRatio] = createSignal(0.5);
  const [resizing, setResizing] = createSignal(false);

  onMount(async () => {
    const wsId = activeWorkspace();
    if (wsId) {
      await loadEnvironments(wsId);
      await loadHistory(wsId);
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        createNewTab();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const tab = getActiveTab();
        if (tab) executeRequest(tab.id, activeWorkspace());
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const tab = getActiveTab();
        if (tab) saveRequest(tab.id);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        setShowCurlImport(true);
      }
    });
  });

  const handleSidebarResize = (e: MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth();

    const onMove = (e: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(500, startWidth + e.clientX - startX));
      setSidebarWidth(newWidth);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleSplitResize = (e: MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const container = (e.target as HTMLElement).parentElement!;

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const ratio = Math.max(0.2, Math.min(0.8, (e.clientY - rect.top) / rect.height));
      setSplitRatio(ratio);
    };

    const onUp = () => {
      setResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const activeTab = () => getActiveTab();

  return (
    <div class="workspace">
      {/* Left sidebar */}
      <div class="workspace-sidebar" style={{ width: `${sidebarWidth()}px` }}>
        <div class="sidebar-nav">
          <button
            class={`sidebar-nav-btn ${sidePanel() === "collections" ? "active" : ""}`}
            onClick={() => setSidePanel("collections")}
            title="Collections"
          >📂</button>
          <button
            class={`sidebar-nav-btn ${sidePanel() === "environments" ? "active" : ""}`}
            onClick={() => setSidePanel("environments")}
            title="Environments"
          >🔧</button>
          <button
            class={`sidebar-nav-btn ${sidePanel() === "history" ? "active" : ""}`}
            onClick={() => setSidePanel("history")}
            title="History"
          >📋</button>
          <div class="sidebar-nav-spacer" />
          <button
            class="sidebar-nav-btn"
            onClick={() => setShowCurlImport(true)}
            title="Import cURL (Ctrl+I)"
          >📥</button>
        </div>

        <div class="sidebar-content">
          <Show when={sidePanel() === "collections"}>
            <Sidebar />
          </Show>
          <Show when={sidePanel() === "environments"}>
            <EnvManager />
          </Show>
          <Show when={sidePanel() === "history"}>
            <div class="history-panel">
              <div class="sidebar-header">
                <span class="sidebar-title">History</span>
              </div>
              <div class="sidebar-empty">History entries will appear here after sending requests.</div>
            </div>
          </Show>
        </div>
      </div>

      {/* Resize handle */}
      <div class="resize-handle vertical" onMouseDown={handleSidebarResize} />

      {/* Main area */}
      <div class="workspace-main">
        <TabBar />

        <Show
          when={activeTab()}
          fallback={
            <div class="empty-workspace">
              <div class="empty-icon">⚡</div>
              <h2>ReqLite</h2>
              <p>High-Performance API Aggregator</p>
              <div class="empty-shortcuts">
                <div class="shortcut"><kbd>Ctrl+N</kbd> New request</div>
                <div class="shortcut"><kbd>Ctrl+Enter</kbd> Send request</div>
                <div class="shortcut"><kbd>Ctrl+S</kbd> Save request</div>
                <div class="shortcut"><kbd>Ctrl+I</kbd> Import cURL</div>
              </div>
              <button class="btn-primary" onClick={() => createNewTab()}>New Request</button>
            </div>
          }
        >
          <div class="split-pane">
            <div class="split-top" style={{ height: `${splitRatio() * 100}%` }}>
              <RequestPanel
                tab={activeTab()!}
                onUpdate={(updates) => updateTab(activeTab()!.id, updates)}
                onSend={() => executeRequest(activeTab()!.id, activeWorkspace())}
              />
            </div>
            <div class="resize-handle horizontal" onMouseDown={handleSplitResize} />
            <div class="split-bottom" style={{ height: `${(1 - splitRatio()) * 100}%` }}>
              <ResponsePanel
                response={activeTab()!.response}
                loading={activeTab()!.loading}
              />
            </div>
          </div>
        </Show>
      </div>

      <StatusBar />

      {/* Modals */}
      <Show when={showCurlImport()}>
        <CurlImport onClose={() => setShowCurlImport(false)} />
      </Show>
    </div>
  );
};
