use crate::db::Database;
use dashmap::DashMap;
use reqwest::Client;
use std::sync::{Arc, RwLock};
use tokio::sync::broadcast;

pub struct AppState {
    pub db: Database,
    pub http_client: Client,
    pub active_environment: RwLock<Option<String>>,
    pub ws_connections: DashMap<String, Arc<WsConnection>>,
    pub sync_status: RwLock<SyncStatus>,
    pub event_tx: broadcast::Sender<String>,
}

pub struct WsConnection {
    pub tx: tokio::sync::mpsc::UnboundedSender<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SyncStatus {
    pub connected: bool,
    pub server_url: Option<String>,
    pub last_revision: u64,
}

impl Default for SyncStatus {
    fn default() -> Self {
        Self {
            connected: false,
            server_url: None,
            last_revision: 0,
        }
    }
}

impl AppState {
    pub fn new(db_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let db = Database::new(db_path)?;
        let http_client = Client::builder()
            .pool_max_idle_per_host(10)
            .pool_idle_timeout(std::time::Duration::from_secs(90))
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        let (event_tx, _) = broadcast::channel(256);

        Ok(Self {
            db,
            http_client,
            active_environment: RwLock::new(None),
            ws_connections: DashMap::new(),
            sync_status: RwLock::new(SyncStatus::default()),
            event_tx,
        })
    }
}
