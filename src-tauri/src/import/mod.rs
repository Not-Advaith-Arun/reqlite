pub mod curl;
pub mod openapi;
pub mod postman;
pub mod tenso;

use tenso_shared::models::*;

/// Shared result type for collection imports (Postman, Tenso, etc.)
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImportedCollection {
    pub name: String,
    pub children: Vec<ImportedCollection>,
    pub requests: Vec<SavedRequest>,
    pub variables: Vec<KeyValue>,
}
