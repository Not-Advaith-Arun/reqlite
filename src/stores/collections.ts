import { createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";
import * as api from "../lib/api";

export interface CollectionNode {
  collection: api.Collection;
  children: CollectionNode[];
  requests: api.SavedRequest[];
  expanded: boolean;
}

const [teams, setTeams] = createSignal<api.Team[]>([]);
const [activeTeam, setActiveTeam] = createSignal<string>("");
const [collections, setCollections] = createStore<CollectionNode[]>([]);
const [loading, setLoading] = createSignal(false);

// Alias for backward compatibility
const activeWorkspace = activeTeam;

export { teams, activeTeam, activeWorkspace, collections, loading };

const [refreshTrigger, setRefreshTrigger] = createSignal(0);
export { refreshTrigger };
export function triggerRefresh() {
  setRefreshTrigger(refreshTrigger() + 1);
  const teamId = activeTeam();
  if (teamId) loadCollections(teamId);
}

export async function loadTeams() {
  const ts = await api.listTeams();
  setTeams(ts);
  if (ts.length > 0 && !activeTeam()) {
    setActiveTeam(ts[0].id);
    await loadCollections(ts[0].id);
  }
}

export async function loadCollections(teamId: string) {
  setLoading(true);
  try {
    const cols = await api.listCollections(teamId);
    const nodes: CollectionNode[] = [];
    const map = new Map<string, CollectionNode>();

    for (const col of cols) {
      const node: CollectionNode = { collection: col, children: [], requests: [], expanded: false };
      map.set(col.id, node);
    }

    for (const col of cols) {
      const node = map.get(col.id)!;
      if (col.parent_id && map.has(col.parent_id)) {
        map.get(col.parent_id)!.children.push(node);
      } else {
        nodes.push(node);
      }
    }

    // Load requests for each collection
    for (const col of cols) {
      const reqs = await api.listRequests(col.id);
      const node = map.get(col.id)!;
      node.requests = reqs;
    }

    setCollections(nodes);
  } finally {
    setLoading(false);
  }
}

export async function addCollection(name: string, parentId: string | null = null) {
  const teamId = activeTeam();
  if (!teamId) return;
  await api.createCollection(teamId, parentId, name);
  await loadCollections(teamId);
}

export async function removeCollection(id: string) {
  const teamId = activeTeam();
  if (!teamId) return;

  // Rust backend handles recursive deletion of children + tombstone creation
  await api.deleteCollection(id);
  await loadCollections(teamId);
}

export async function addRequest(collectionId: string, name: string, method: string = "GET") {
  await api.createRequest(collectionId, name, method, "");
  const teamId = activeTeam();
  if (teamId) await loadCollections(teamId);
}

export async function removeRequest(id: string) {
  try {
    await api.deleteRequest(id);
  } catch (err) {
    console.error("Failed to delete request:", err);
  }
  const teamId = activeTeam();
  if (teamId) await loadCollections(teamId);
}
