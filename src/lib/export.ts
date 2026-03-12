import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { CollectionNode } from "../stores/collections";
import type { Environment, SavedRequest } from "./api";

interface TensoExportRequest {
  name: string;
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  params: { key: string; value: string; enabled: boolean }[];
  body: SavedRequest["body"];
  auth: SavedRequest["auth"];
  pre_script: string;
  post_script: string;
  ws_messages: SavedRequest["ws_messages"];
  sort_order: number;
}

interface TensoExportCollection {
  name: string;
  children: TensoExportCollection[];
  requests: TensoExportRequest[];
}

interface TensoExportFile {
  format: "tenso";
  version: 1;
  exported_at: string;
  collection: TensoExportCollection;
  environments?: { name: string; variables: { key: string; value: string; enabled: boolean }[] }[];
}

function stripRequest(req: SavedRequest): TensoExportRequest {
  return {
    name: req.name,
    method: req.method,
    url: req.url,
    headers: req.headers,
    params: req.params,
    body: req.body,
    auth: req.auth,
    pre_script: req.pre_script,
    post_script: req.post_script,
    ws_messages: req.ws_messages,
    sort_order: req.sort_order,
  };
}

function convertNode(node: CollectionNode): TensoExportCollection {
  return {
    name: node.collection.name,
    children: node.children.map(convertNode),
    requests: node.requests.map(stripRequest),
  };
}

export function buildExportJson(node: CollectionNode, environments?: Environment[]): string {
  const file: TensoExportFile = {
    format: "tenso",
    version: 1,
    exported_at: new Date().toISOString(),
    collection: convertNode(node),
  };

  if (environments && environments.length > 0) {
    file.environments = environments.map((env) => ({
      name: env.name,
      variables: env.variables,
    }));
  }

  return JSON.stringify(file, null, 2);
}

export async function saveExportFile(filename: string, jsonStr: string): Promise<void> {
  const path = await save({
    defaultPath: filename,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (!path) return; // user cancelled

  await writeTextFile(path, jsonStr);
}
