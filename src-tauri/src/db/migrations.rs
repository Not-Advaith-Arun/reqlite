use rusqlite::Connection;

pub fn run(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sync_url TEXT,
            api_key TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL REFERENCES workspaces(id),
            parent_id TEXT REFERENCES collections(id),
            name TEXT NOT NULL,
            sort_order REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_collections_workspace ON collections(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_collections_parent ON collections(parent_id);

        CREATE TABLE IF NOT EXISTS requests (
            id TEXT PRIMARY KEY,
            collection_id TEXT NOT NULL REFERENCES collections(id),
            name TEXT NOT NULL,
            method TEXT NOT NULL DEFAULT 'GET',
            url TEXT NOT NULL DEFAULT '',
            headers TEXT NOT NULL DEFAULT '[]',
            params TEXT NOT NULL DEFAULT '[]',
            body TEXT NOT NULL DEFAULT '{\"type\":\"none\"}',
            auth TEXT NOT NULL DEFAULT '{\"type\":\"none\"}',
            pre_script TEXT NOT NULL DEFAULT '',
            post_script TEXT NOT NULL DEFAULT '',
            sort_order REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_requests_collection ON requests(collection_id);

        CREATE TABLE IF NOT EXISTS environments (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL REFERENCES workspaces(id),
            name TEXT NOT NULL,
            variables TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_environments_workspace ON environments(workspace_id);

        CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            method TEXT NOT NULL,
            url TEXT NOT NULL,
            status INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL,
            response_size INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            request_data TEXT NOT NULL DEFAULT '{}',
            response_headers TEXT NOT NULL DEFAULT '{}',
            response_body_preview TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_history_workspace ON history(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp);

        CREATE TABLE IF NOT EXISTS websocket_connections (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL REFERENCES workspaces(id),
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            headers TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            op_type TEXT NOT NULL,
            fields TEXT NOT NULL DEFAULT '{}',
            revision INTEGER NOT NULL,
            user_id TEXT NOT NULL DEFAULT 'local',
            timestamp TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sync_cursors (
            workspace_id TEXT PRIMARY KEY,
            last_revision INTEGER NOT NULL DEFAULT 0
        );
    ")?;
    Ok(())
}
