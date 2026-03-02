use crate::state::AppState;
use reqlite_shared::models::*;
use std::sync::Arc;

#[tauri::command]
pub async fn list_history(state: tauri::State<'_, Arc<AppState>>, workspace_id: String, limit: Option<u32>) -> Result<Vec<HistoryEntry>, String> {
    state.db.list_history(&workspace_id, limit.unwrap_or(100)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_history(state: tauri::State<'_, Arc<AppState>>, workspace_id: String) -> Result<(), String> {
    state.db.clear_history(&workspace_id).map_err(|e| e.to_string())
}
