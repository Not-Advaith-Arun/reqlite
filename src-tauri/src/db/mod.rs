mod migrations;

use rusqlite::Connection;
use std::sync::Mutex;
use reqlite_shared::models::*;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let conn = Connection::open(path)?;
        conn.execute_batch("
            PRAGMA journal_mode=WAL;
            PRAGMA synchronous=NORMAL;
            PRAGMA foreign_keys=ON;
            PRAGMA busy_timeout=5000;
        ")?;
        let db = Self { conn: Mutex::new(conn) };
        db.run_migrations()?;
        db.ensure_default_workspace()?;
        Ok(db)
    }

    fn run_migrations(&self) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        migrations::run(&conn)?;
        Ok(())
    }

    fn ensure_default_workspace(&self) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM workspaces", [], |r| r.get(0))?;
        if count == 0 {
            let id = ulid::Ulid::new().to_string();
            let now = chrono::Utc::now().to_rfc3339();
            conn.execute(
                "INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![id, "Default Workspace", now, now],
            )?;
        }
        Ok(())
    }

    // Workspace operations
    pub fn list_workspaces(&self) -> Result<Vec<Workspace>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, sync_url, api_key, created_at, updated_at FROM workspaces ORDER BY created_at")?;
        let rows = stmt.query_map([], |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                sync_url: row.get(2)?,
                api_key: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_workspace(&self, name: &str) -> Result<Workspace, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let id = ulid::Ulid::new().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![id, name, now, now],
        )?;
        Ok(Workspace { id, name: name.to_string(), sync_url: None, api_key: None, created_at: now.clone(), updated_at: now })
    }

    // Collection operations
    pub fn list_collections(&self, workspace_id: &str) -> Result<Vec<Collection>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, workspace_id, parent_id, name, sort_order, created_at, updated_at FROM collections WHERE workspace_id = ?1 ORDER BY sort_order"
        )?;
        let rows = stmt.query_map([workspace_id], |row| {
            Ok(Collection {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                parent_id: row.get(2)?,
                name: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_collection(&self, workspace_id: &str, parent_id: Option<&str>, name: &str) -> Result<Collection, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let id = ulid::Ulid::new().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let sort_order: f64 = conn.query_row(
            "SELECT COALESCE(MAX(sort_order), 0.0) + 1.0 FROM collections WHERE workspace_id = ?1 AND parent_id IS ?2",
            rusqlite::params![workspace_id, parent_id],
            |row| row.get(0),
        )?;
        conn.execute(
            "INSERT INTO collections (id, workspace_id, parent_id, name, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![id, workspace_id, parent_id, name, sort_order, now, now],
        )?;
        Ok(Collection {
            id, workspace_id: workspace_id.to_string(), parent_id: parent_id.map(|s| s.to_string()),
            name: name.to_string(), sort_order, created_at: now.clone(), updated_at: now,
        })
    }

    pub fn update_collection(&self, id: &str, name: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute("UPDATE collections SET name = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![name, now, id])?;
        Ok(())
    }

    pub fn delete_collection(&self, id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM requests WHERE collection_id = ?1", [id])?;
        conn.execute("DELETE FROM collections WHERE parent_id = ?1", [id])?;
        conn.execute("DELETE FROM collections WHERE id = ?1", [id])?;
        Ok(())
    }

    // Request operations
    pub fn list_requests(&self, collection_id: &str) -> Result<Vec<SavedRequest>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, collection_id, name, method, url, headers, params, body, auth, pre_script, post_script, sort_order, created_at, updated_at FROM requests WHERE collection_id = ?1 ORDER BY sort_order"
        )?;
        let rows = stmt.query_map([collection_id], |row| {
            let headers_json: String = row.get(5)?;
            let params_json: String = row.get(6)?;
            let body_json: String = row.get(7)?;
            let auth_json: String = row.get(8)?;
            Ok(SavedRequest {
                id: row.get(0)?,
                collection_id: row.get(1)?,
                name: row.get(2)?,
                method: row.get(3)?,
                url: row.get(4)?,
                headers: serde_json::from_str(&headers_json).unwrap_or_default(),
                params: serde_json::from_str(&params_json).unwrap_or_default(),
                body: serde_json::from_str(&body_json).unwrap_or(RequestBody::None),
                auth: serde_json::from_str(&auth_json).unwrap_or(AuthConfig::None),
                pre_script: row.get(9)?,
                post_script: row.get(10)?,
                sort_order: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })?;
        rows.collect()
    }

    pub fn get_request(&self, id: &str) -> Result<Option<SavedRequest>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, collection_id, name, method, url, headers, params, body, auth, pre_script, post_script, sort_order, created_at, updated_at FROM requests WHERE id = ?1"
        )?;
        let mut rows = stmt.query_map([id], |row| {
            let headers_json: String = row.get(5)?;
            let params_json: String = row.get(6)?;
            let body_json: String = row.get(7)?;
            let auth_json: String = row.get(8)?;
            Ok(SavedRequest {
                id: row.get(0)?,
                collection_id: row.get(1)?,
                name: row.get(2)?,
                method: row.get(3)?,
                url: row.get(4)?,
                headers: serde_json::from_str(&headers_json).unwrap_or_default(),
                params: serde_json::from_str(&params_json).unwrap_or_default(),
                body: serde_json::from_str(&body_json).unwrap_or(RequestBody::None),
                auth: serde_json::from_str(&auth_json).unwrap_or(AuthConfig::None),
                pre_script: row.get(9)?,
                post_script: row.get(10)?,
                sort_order: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })?;
        Ok(rows.next().transpose()?)
    }

    pub fn create_request(&self, collection_id: &str, name: &str, method: &str, url: &str) -> Result<SavedRequest, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let id = ulid::Ulid::new().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let sort_order: f64 = conn.query_row(
            "SELECT COALESCE(MAX(sort_order), 0.0) + 1.0 FROM requests WHERE collection_id = ?1",
            [collection_id],
            |row| row.get(0),
        )?;
        let empty_arr = "[]";
        let body_json = serde_json::to_string(&RequestBody::None).unwrap();
        let auth_json = serde_json::to_string(&AuthConfig::None).unwrap();
        conn.execute(
            "INSERT INTO requests (id, collection_id, name, method, url, headers, params, body, auth, pre_script, post_script, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, '', '', ?10, ?11, ?12)",
            rusqlite::params![id, collection_id, name, method, url, empty_arr, empty_arr, body_json, auth_json, sort_order, now, now],
        )?;
        Ok(SavedRequest {
            id, collection_id: collection_id.to_string(), name: name.to_string(),
            method: method.to_string(), url: url.to_string(),
            headers: vec![], params: vec![], body: RequestBody::None, auth: AuthConfig::None,
            pre_script: String::new(), post_script: String::new(), sort_order,
            created_at: now.clone(), updated_at: now,
        })
    }

    pub fn update_request(&self, req: &SavedRequest) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        let headers_json = serde_json::to_string(&req.headers).unwrap();
        let params_json = serde_json::to_string(&req.params).unwrap();
        let body_json = serde_json::to_string(&req.body).unwrap();
        let auth_json = serde_json::to_string(&req.auth).unwrap();
        conn.execute(
            "UPDATE requests SET name=?1, method=?2, url=?3, headers=?4, params=?5, body=?6, auth=?7, pre_script=?8, post_script=?9, updated_at=?10 WHERE id=?11",
            rusqlite::params![req.name, req.method, req.url, headers_json, params_json, body_json, auth_json, req.pre_script, req.post_script, now, req.id],
        )?;
        Ok(())
    }

    pub fn delete_request(&self, id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM requests WHERE id = ?1", [id])?;
        Ok(())
    }

    // Environment operations
    pub fn list_environments(&self, workspace_id: &str) -> Result<Vec<Environment>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, workspace_id, name, variables, created_at, updated_at FROM environments WHERE workspace_id = ?1 ORDER BY name"
        )?;
        let rows = stmt.query_map([workspace_id], |row| {
            let vars_json: String = row.get(3)?;
            Ok(Environment {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                variables: serde_json::from_str(&vars_json).unwrap_or_default(),
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_environment(&self, workspace_id: &str, name: &str) -> Result<Environment, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let id = ulid::Ulid::new().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO environments (id, workspace_id, name, variables, created_at, updated_at) VALUES (?1, ?2, ?3, '[]', ?4, ?5)",
            rusqlite::params![id, workspace_id, name, now, now],
        )?;
        Ok(Environment { id, workspace_id: workspace_id.to_string(), name: name.to_string(), variables: vec![], created_at: now.clone(), updated_at: now })
    }

    pub fn update_environment(&self, env: &Environment) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        let vars_json = serde_json::to_string(&env.variables).unwrap();
        conn.execute(
            "UPDATE environments SET name=?1, variables=?2, updated_at=?3 WHERE id=?4",
            rusqlite::params![env.name, vars_json, now, env.id],
        )?;
        Ok(())
    }

    pub fn delete_environment(&self, id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM environments WHERE id = ?1", [id])?;
        Ok(())
    }

    // History operations
    pub fn add_history(&self, entry: &HistoryEntry) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO history (id, workspace_id, method, url, status, duration_ms, response_size, timestamp, request_data, response_headers, response_body_preview) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![entry.id, entry.workspace_id, entry.method, entry.url, entry.status, entry.duration_ms, entry.response_size, entry.timestamp, entry.request_data, entry.response_headers, entry.response_body_preview],
        )?;
        Ok(())
    }

    pub fn list_history(&self, workspace_id: &str, limit: u32) -> Result<Vec<HistoryEntry>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, workspace_id, method, url, status, duration_ms, response_size, timestamp, request_data, response_headers, response_body_preview FROM history WHERE workspace_id = ?1 ORDER BY timestamp DESC LIMIT ?2"
        )?;
        let rows = stmt.query_map(rusqlite::params![workspace_id, limit], |row| {
            Ok(HistoryEntry {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                method: row.get(2)?,
                url: row.get(3)?,
                status: row.get(4)?,
                duration_ms: row.get(5)?,
                response_size: row.get(6)?,
                timestamp: row.get(7)?,
                request_data: row.get(8)?,
                response_headers: row.get(9)?,
                response_body_preview: row.get(10)?,
            })
        })?;
        rows.collect()
    }

    pub fn clear_history(&self, workspace_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM history WHERE workspace_id = ?1", [workspace_id])?;
        Ok(())
    }
}
