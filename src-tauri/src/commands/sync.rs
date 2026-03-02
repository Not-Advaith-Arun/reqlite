use crate::state::AppState;
use std::sync::Arc;

#[tauri::command]
pub async fn connect_sync(
    state: tauri::State<'_, Arc<AppState>>,
    server_url: String,
    token: String,
    workspace_id: String,
) -> Result<(), String> {
    crate::sync_client::connect(&state, &server_url, &token, &workspace_id).await
}

#[tauri::command]
pub async fn disconnect_sync(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<(), String> {
    let mut status = state.sync_status.write().unwrap();
    status.connected = false;
    status.server_url = None;
    Ok(())
}

#[tauri::command]
pub async fn get_sync_status(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<crate::state::SyncStatus, String> {
    Ok(state.sync_status.read().unwrap().clone())
}
