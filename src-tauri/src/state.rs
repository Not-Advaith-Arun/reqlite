use crate::db::Database;
use dashmap::DashMap;
use reqwest::Client;
use std::sync::{Arc, RwLock};

pub struct AppState {
    pub db: Database,
    pub http_client: Client,
    pub active_environment: RwLock<Option<String>>,
    pub ws_connections: DashMap<String, Arc<WsConnection>>,
}

pub struct WsConnection {
    pub tx: tokio::sync::mpsc::UnboundedSender<String>,
}

impl AppState {
    pub fn new(db_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let db = Database::new(db_path)?;
        let http_client = Client::builder()
            .pool_max_idle_per_host(10)
            .pool_idle_timeout(std::time::Duration::from_secs(90))
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        Ok(Self {
            db,
            http_client,
            active_environment: RwLock::new(None),
            ws_connections: DashMap::new(),
        })
    }
}
