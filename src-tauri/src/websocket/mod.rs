use crate::state::{AppState, WsConnection};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::http::Request;
use tauri::Emitter;

#[derive(serde::Serialize, Clone)]
struct WsMessageEvent {
    content: String,
    timestamp: u64,
}

pub async fn connect(
    state: &AppState,
    app_handle: &tauri::AppHandle,
    id: &str,
    url: &str,
    headers: &[tenso_shared::models::KeyValue],
) -> Result<(), String> {
    let mut request = Request::builder().uri(url);
    for kv in headers.iter().filter(|h| h.enabled) {
        request = request.header(&kv.key, &kv.value);
    }
    let request = request.body(()).map_err(|e| e.to_string())?;
    let (ws_stream, _) = connect_async(request).await.map_err(|e| e.to_string())?;
    let (mut write, mut read) = ws_stream.split();

    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();
    let ws_conn = Arc::new(WsConnection { tx });
    state.ws_connections.insert(id.to_string(), ws_conn);

    let handle = app_handle.clone();
    let _conn_id = id.to_string();

    // Send messages from channel to WebSocket
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if write.send(tokio_tungstenite::tungstenite::Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Read messages from WebSocket and emit to frontend
    let conn_id2 = id.to_string();
    tokio::spawn(async move {
        while let Some(Ok(msg)) = read.next().await {
            match msg {
                tokio_tungstenite::tungstenite::Message::Text(text) => {
                    let event = WsMessageEvent {
                        content: text.to_string(),
                        timestamp: SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis() as u64,
                    };
                    let _ = handle.emit(&format!("ws-message-{}", conn_id2), event);
                }
                tokio_tungstenite::tungstenite::Message::Close(frame) => {
                    let reason = frame.map(|f| f.reason.to_string()).unwrap_or_default();
                    let _ = handle.emit(&format!("ws-closed-{}", conn_id2), reason);
                    return;
                }
                _ => {}
            }
        }
        // Connection dropped without close frame
        let _ = handle.emit(&format!("ws-closed-{}", conn_id2), String::new());
    });

    Ok(())
}
