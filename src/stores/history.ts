import { createSignal } from "solid-js";
import * as api from "../lib/api";
import { triggerRefresh, expandFolder, setLastUsedCollectionId } from "./collections";
import { triggerPush } from "../lib/sync";

const [history, setHistory] = createSignal<api.HistoryEntry[]>([]);
const [historySearch, setHistorySearch] = createSignal("");

export { history, setHistory, historySearch, setHistorySearch };

const [historyRefreshTrigger, setHistoryRefreshTrigger] = createSignal(0);
export { historyRefreshTrigger };
export function triggerHistoryRefresh() {
  setHistoryRefreshTrigger(historyRefreshTrigger() + 1);
}

export async function loadHistory(teamId: string) {
  const entries = await api.listHistory(teamId, 200);
  setHistory(entries);
}

export async function clearAllHistory(teamId: string) {
  await api.clearHistory(teamId);
  setHistory([]);
}

export interface ParsedRequestData {
  headers: api.KeyValue[];
  params: api.KeyValue[];
  body: api.RequestBody;
  auth: api.AuthConfig;
}

export function parseHistoryRequestData(entry: api.HistoryEntry): ParsedRequestData {
  const defaults: ParsedRequestData = {
    headers: [],
    params: [],
    body: { type: "none" },
    auth: { type: "none" },
  };
  try {
    const parsed = JSON.parse(entry.request_data);
    return {
      headers: Array.isArray(parsed.headers) ? parsed.headers : defaults.headers,
      params: Array.isArray(parsed.params) ? parsed.params : defaults.params,
      body: parsed.body?.type ? parsed.body : defaults.body,
      auth: parsed.auth?.type ? parsed.auth : defaults.auth,
    };
  } catch {
    return defaults;
  }
}

export async function saveHistoryAsRequest(entry: api.HistoryEntry, collectionId: string) {
  const { headers, params, body, auth } = parseHistoryRequestData(entry);
  const name = `${entry.method} ${entry.url}`;
  const saved = await api.createRequest(collectionId, name, entry.method, entry.url);
  await api.updateRequest({
    ...saved,
    headers,
    params,
    body,
    auth,
    pre_script: "",
    post_script: "",
    ws_messages: [],
  });
  triggerRefresh();
  triggerPush();
  expandFolder(collectionId);
  setLastUsedCollectionId(collectionId);
}

export function filteredHistory() {
  const search = historySearch().toLowerCase();
  if (!search) return history();
  return history().filter(h =>
    h.url.toLowerCase().includes(search) ||
    h.method.toLowerCase().includes(search)
  );
}
