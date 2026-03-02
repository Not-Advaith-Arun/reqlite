use crate::state::AppState;
use reqlite_shared::models::*;
use std::sync::Arc;

#[tauri::command]
pub async fn import_curl(
    _state: tauri::State<'_, Arc<AppState>>,
    curl_command: String,
) -> Result<SavedRequest, String> {
    crate::import::curl::parse_curl(&curl_command)
}

#[tauri::command]
pub async fn import_openapi(
    state: tauri::State<'_, Arc<AppState>>,
    spec_json: String,
    workspace_id: String,
) -> Result<Vec<Collection>, String> {
    crate::import::openapi::import_openapi_spec(&state, &spec_json, &workspace_id).await
}
