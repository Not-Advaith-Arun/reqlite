import { createCollection, createRequest, updateRequest, type ImportedCollection, type SavedRequest } from "./api";

export async function persistImportedTree(
  imported: ImportedCollection,
  teamId: string,
  parentId: string | null
): Promise<void> {
  const collection = await createCollection(teamId, parentId, imported.name);

  for (const req of imported.requests) {
    const created = await createRequest(collection.id, req.name, req.method, req.url);
    const full: SavedRequest = {
      ...created,
      headers: req.headers || [],
      params: req.params || [],
      body: req.body || { type: "none" },
      auth: req.auth || { type: "none" },
      pre_script: req.pre_script || "",
      post_script: req.post_script || "",
    };
    await updateRequest(full);
  }

  for (const child of imported.children) {
    await persistImportedTree(child, teamId, collection.id);
  }
}
