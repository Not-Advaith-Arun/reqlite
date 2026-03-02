use crate::state::AppState;
use reqlite_shared::protocol::*;

pub async fn connect(
    state: &AppState,
    server_url: &str,
    token: &str,
    workspace_id: &str,
) -> Result<(), String> {
    let ws_url = format!("{}/ws", server_url.replace("http", "ws"));
    let (ws_stream, _) = tokio_tungstenite::connect_async(&ws_url)
        .await
        .map_err(|e| format!("Failed to connect to sync server: {}", e))?;

    let mut status = state.sync_status.write().unwrap();
    status.connected = true;
    status.server_url = Some(server_url.to_string());

    tracing::info!("Connected to sync server at {}", server_url);
    Ok(())
}
