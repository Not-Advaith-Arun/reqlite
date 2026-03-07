use tenso_shared::models::*;

pub fn parse_curl(input: &str) -> Result<SavedRequest, String> {
    let input = input.trim();
    let input = if input.starts_with("curl") {
        &input[4..]
    } else {
        input
    };
    let input = input.trim();

    let mut method = "GET".to_string();
    let mut url = String::new();
    let mut headers: Vec<KeyValue> = vec![];
    let mut body = RequestBody::None;

    let parts = shell_words::split(input).map_err(|e| format!("Failed to parse: {}", e))?;
    let mut i = 0;
    while i < parts.len() {
        let part = &parts[i];
        match part.as_str() {
            "-X" | "--request" => {
                i += 1;
                if i < parts.len() {
                    method = parts[i].to_uppercase();
                }
            }
            "-H" | "--header" => {
                i += 1;
                if i < parts.len() {
                    if let Some((k, v)) = parts[i].split_once(':') {
                        headers.push(KeyValue {
                            key: k.trim().to_string(),
                            value: v.trim().to_string(),
                            enabled: true,
                        });
                    }
                }
            }
            "-d" | "--data" | "--data-raw" | "--data-binary" => {
                i += 1;
                if i < parts.len() {
                    let data = &parts[i];
                    // Try to detect if it's JSON
                    if data.starts_with('{') || data.starts_with('[') {
                        body = RequestBody::Json { content: data.clone() };
                        if method == "GET" { method = "POST".to_string(); }
                    } else {
                        body = RequestBody::Raw { content: data.clone(), content_type: "text/plain".into() };
                        if method == "GET" { method = "POST".to_string(); }
                    }
                }
            }
            "--data-urlencode" => {
                i += 1;
                // Handle form urlencoded
                if method == "GET" { method = "POST".to_string(); }
            }
            "-u" | "--user" => {
                i += 1;
                // Basic auth handled separately
            }
            s if !s.starts_with('-') && url.is_empty() => {
                url = s.to_string();
            }
            _ => {}
        }
        i += 1;
    }

    if url.is_empty() {
        return Err("No URL found in curl command".into());
    }

    // Extract query params from URL into params array (params is the canonical source
    // for query parameters — the backend strips query from URL and rebuilds from params)
    let mut params: Vec<KeyValue> = vec![];
    let base_url = if let Ok(parsed) = reqwest::Url::parse(&url) {
        for (k, v) in parsed.query_pairs() {
            params.push(KeyValue {
                key: k.into_owned(),
                value: v.into_owned(),
                enabled: true,
            });
        }
        // URL without query string
        let mut clean = parsed.clone();
        clean.set_query(None);
        clean.to_string()
    } else {
        url.clone()
    };

    let id = ulid::Ulid::new().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    Ok(SavedRequest {
        id,
        collection_id: String::new(),
        name: format!("{} {}", method, base_url),
        method,
        url,
        headers,
        params,
        body,
        auth: AuthConfig::None,
        pre_script: String::new(),
        post_script: String::new(),
        ws_messages: vec![],
        sort_order: 0.0,
        created_at: now.clone(),
        updated_at: now,
    })
}
