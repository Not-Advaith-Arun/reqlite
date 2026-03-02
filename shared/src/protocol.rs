use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SyncMessage {
    #[serde(rename = "auth")]
    Auth { token: String },
    #[serde(rename = "auth_ok")]
    AuthOk { user_id: String },
    #[serde(rename = "auth_error")]
    AuthError { message: String },
    #[serde(rename = "subscribe")]
    Subscribe { workspace_id: String, last_revision: u64 },
    #[serde(rename = "delta")]
    Delta { operations: Vec<Operation> },
    #[serde(rename = "operation")]
    Op(Operation),
    #[serde(rename = "ack")]
    Ack { client_op_id: String, revision: u64 },
    #[serde(rename = "conflict")]
    Conflict { client_op_id: String, conflicting_fields: Vec<String>, latest: serde_json::Value },
    #[serde(rename = "error")]
    Error { message: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Operation {
    pub id: String,
    pub workspace_id: String,
    pub entity_type: EntityType,
    pub entity_id: String,
    pub op_type: OpType,
    pub fields: serde_json::Value,
    pub revision: u64,
    pub user_id: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EntityType {
    Collection,
    Request,
    Environment,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OpType {
    Create,
    Update,
    Delete,
}
