import { Component, Show, createSignal } from "solid-js";
import type { CollectionNode } from "../../stores/collections";
import { activeTeam } from "../../stores/collections";
import { listEnvironments } from "../../lib/api";
import { buildExportJson, saveExportFile } from "../../lib/export";

interface Props {
  node: CollectionNode;
  onClose: () => void;
}

export const ExportDialog: Component<Props> = (props) => {
  const [includeEnvs, setIncludeEnvs] = createSignal(false);
  const [exporting, setExporting] = createSignal(false);
  const [error, setError] = createSignal("");

  const countRequests = (node: CollectionNode): number => {
    let count = node.requests.length;
    for (const child of node.children) {
      count += countRequests(child);
    }
    return count;
  };

  const countFolders = (node: CollectionNode): number => {
    let count = node.children.length;
    for (const child of node.children) {
      count += countFolders(child);
    }
    return count;
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setError("");

      let environments = undefined;
      if (includeEnvs()) {
        const teamId = activeTeam();
        if (teamId) {
          environments = await listEnvironments(teamId);
        }
      }

      const json = buildExportJson(props.node, environments);
      const safeName = props.node.collection.name.replace(/[^a-zA-Z0-9_-]/g, "_");
      await saveExportFile(`${safeName}.tenso.json`, json);
      props.onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div class="modal-overlay" onClick={props.onClose}>
      <div class="modal" onClick={(e) => e.stopPropagation()} style={{ width: "420px" }}>
        <div class="modal-header">
          <h3>Export Collection</h3>
          <button class="icon-btn" onClick={props.onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="3" y1="3" x2="11" y2="11" /><line x1="11" y1="3" x2="3" y2="11" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div style={{
            padding: "12px",
            background: "var(--bg-tertiary)",
            "border-radius": "var(--radius-md)",
            "margin-bottom": "12px",
          }}>
            <div style={{ "font-size": "14px", "font-weight": "500", "margin-bottom": "4px" }}>
              {props.node.collection.name}
            </div>
            <div style={{ "font-size": "12px", color: "var(--text-secondary)" }}>
              {countRequests(props.node)} request{countRequests(props.node) !== 1 ? "s" : ""}
              {countFolders(props.node) > 0 && `, ${countFolders(props.node)} folder${countFolders(props.node) !== 1 ? "s" : ""}`}
            </div>
          </div>

          <label style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
            "font-size": "13px",
            cursor: "pointer",
            padding: "4px 0",
          }}>
            <input
              type="checkbox"
              checked={includeEnvs()}
              onChange={(e) => setIncludeEnvs(e.currentTarget.checked)}
            />
            Include environments
          </label>

          <Show when={error()}>
            <div class="import-error" style={{ "margin-top": "8px" }}>{error()}</div>
          </Show>
        </div>
        <div class="modal-footer">
          <button class="btn-sm" onClick={props.onClose}>Cancel</button>
          <button
            class="btn-primary"
            onClick={handleExport}
            disabled={exporting()}
            style={{ opacity: exporting() ? "0.5" : "1" }}
          >
            {exporting() ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
};
