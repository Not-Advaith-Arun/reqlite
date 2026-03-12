use serde::Deserialize;
use tenso_shared::models::*;
use super::ImportedCollection;

#[derive(Deserialize)]
struct TensoExportFile {
    format: String,
    version: u32,
    collection: TensoExportCollection,
    #[serde(default)]
    environments: Vec<TensoExportEnvironment>,
}

#[derive(Deserialize)]
struct TensoExportCollection {
    name: String,
    #[serde(default)]
    children: Vec<TensoExportCollection>,
    #[serde(default)]
    requests: Vec<TensoExportRequest>,
}

#[derive(Deserialize)]
struct TensoExportRequest {
    name: String,
    method: String,
    url: String,
    #[serde(default)]
    headers: Vec<KeyValue>,
    #[serde(default)]
    params: Vec<KeyValue>,
    #[serde(default = "default_body")]
    body: RequestBody,
    #[serde(default)]
    auth: AuthConfig,
    #[serde(default)]
    pre_script: String,
    #[serde(default)]
    post_script: String,
    #[serde(default)]
    ws_messages: Vec<WsMessageTemplate>,
    #[serde(default)]
    sort_order: f64,
}

fn default_body() -> RequestBody {
    RequestBody::None
}

#[derive(Deserialize)]
struct TensoExportEnvironment {
    name: String,
    #[serde(default)]
    variables: Vec<KeyValue>,
}

pub fn parse_tenso_export(json: &str) -> Result<(ImportedCollection, Vec<Environment>), String> {
    let file: TensoExportFile = serde_json::from_str(json)
        .map_err(|e| format!("Invalid Tenso export JSON: {}", e))?;

    if file.format != "tenso" {
        return Err(format!("Unknown format: '{}', expected 'tenso'", file.format));
    }

    if file.version != 1 {
        return Err(format!("Unsupported version: {}, expected 1", file.version));
    }

    let collection = convert_collection(&file.collection);

    let environments: Vec<Environment> = file.environments.into_iter().map(|env| {
        Environment {
            id: String::new(),
            team_id: String::new(),
            name: env.name,
            variables: env.variables,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }).collect();

    Ok((collection, environments))
}

fn convert_collection(col: &TensoExportCollection) -> ImportedCollection {
    let requests: Vec<SavedRequest> = col.requests.iter().map(|r| {
        SavedRequest {
            id: String::new(),
            collection_id: String::new(),
            name: r.name.clone(),
            method: r.method.clone(),
            url: r.url.clone(),
            headers: r.headers.clone(),
            params: r.params.clone(),
            body: r.body.clone(),
            auth: r.auth.clone(),
            pre_script: r.pre_script.clone(),
            post_script: r.post_script.clone(),
            ws_messages: r.ws_messages.clone(),
            sort_order: r.sort_order,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }).collect();

    let children: Vec<ImportedCollection> = col.children.iter().map(convert_collection).collect();

    ImportedCollection {
        name: col.name.clone(),
        children,
        requests,
        variables: vec![],
    }
}
