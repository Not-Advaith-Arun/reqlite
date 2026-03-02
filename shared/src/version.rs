use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VectorClock {
    pub clocks: HashMap<String, u64>,
}

impl VectorClock {
    pub fn new() -> Self {
        Self { clocks: HashMap::new() }
    }

    pub fn increment(&mut self, node_id: &str) {
        let counter = self.clocks.entry(node_id.to_string()).or_insert(0);
        *counter += 1;
    }

    pub fn merge(&mut self, other: &VectorClock) {
        for (node, &count) in &other.clocks {
            let entry = self.clocks.entry(node.clone()).or_insert(0);
            *entry = (*entry).max(count);
        }
    }

    pub fn is_concurrent_with(&self, other: &VectorClock) -> bool {
        let self_greater = self.clocks.iter().any(|(k, &v)| v > *other.clocks.get(k).unwrap_or(&0));
        let other_greater = other.clocks.iter().any(|(k, &v)| v > *self.clocks.get(k).unwrap_or(&0));
        self_greater && other_greater
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncCursor {
    pub workspace_id: String,
    pub last_revision: u64,
}
