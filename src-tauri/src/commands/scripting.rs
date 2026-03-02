use crate::state::AppState;
use std::sync::Arc;

#[tauri::command]
pub async fn run_script(
    _state: tauri::State<'_, Arc<AppState>>,
    script: String,
    context: serde_json::Value,
) -> Result<serde_json::Value, String> {
    crate::scripting::execute_script(&script, &context)
}
