import { Component, createSignal, Show } from "solid-js";
import { TensoImport } from "./TensoImport";
import { PostmanImport } from "./PostmanImport";
import { CurlImport } from "./CurlImport";

export type ImportTab = "tenso" | "postman" | "curl";

interface Props {
  onClose: () => void;
  initialTab?: ImportTab;
}

export const ImportModal: Component<Props> = (props) => {
  const [activeTab, setActiveTab] = createSignal<ImportTab>(props.initialTab || "tenso");

  const tabs: { id: ImportTab; label: string }[] = [
    { id: "tenso", label: "Tenso" },
    { id: "postman", label: "Postman" },
    { id: "curl", label: "cURL" },
  ];

  return (
    <div class="modal-overlay" onClick={props.onClose}>
      <div class="modal" onClick={(e) => e.stopPropagation()} style={{ width: "640px" }}>
        <div class="modal-header">
          <h3>Import</h3>
          <button class="icon-btn" onClick={props.onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="3" y1="3" x2="11" y2="11" /><line x1="11" y1="3" x2="3" y2="11" />
            </svg>
          </button>
        </div>
        <div class="import-tabs">
          {tabs.map((tab) => (
            <button
              class={`import-tab ${activeTab() === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Show when={activeTab() === "tenso"}>
          <TensoImport onClose={props.onClose} embedded />
        </Show>
        <Show when={activeTab() === "postman"}>
          <PostmanImport onClose={props.onClose} embedded />
        </Show>
        <Show when={activeTab() === "curl"}>
          <CurlImport onClose={props.onClose} embedded />
        </Show>
      </div>
    </div>
  );
};
