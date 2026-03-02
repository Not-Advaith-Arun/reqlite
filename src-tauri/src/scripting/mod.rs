use boa_engine::{Context, Source, JsValue, JsResult};
use serde_json::Value;

pub fn execute_script(script: &str, context_data: &Value) -> Result<Value, String> {
    let mut ctx = Context::default();

    // Inject pm object with environment variables and request context
    let pm_script = format!(
        r#"
        var pm = {{
            variables: {{
                _data: {context},
                get: function(key) {{ return this._data[key] || ''; }},
                set: function(key, value) {{ this._data[key] = value; }}
            }},
            environment: {{
                _data: {{}},
                get: function(key) {{ return this._data[key] || ''; }},
                set: function(key, value) {{ this._data[key] = value; }}
            }},
            response: {{
                code: 0,
                status: '',
                responseTime: 0,
                json: function() {{ return {{}}; }}
            }},
            test: function(name, fn) {{ fn(); }}
        }};
        "#,
        context = serde_json::to_string(context_data).unwrap_or("{}".into())
    );

    ctx.eval(Source::from_bytes(&pm_script))
        .map_err(|e| format!("Script init error: {}", e))?;

    let result = ctx.eval(Source::from_bytes(script))
        .map_err(|e| format!("Script error: {}", e))?;

    // Extract pm.variables._data back
    let extract = ctx.eval(Source::from_bytes("JSON.stringify(pm.variables._data)"))
        .map_err(|e| format!("Failed to extract variables: {}", e))?;

    match extract.as_string() {
        Some(s) => {
            let parsed: Value = serde_json::from_str(&s.to_std_string_escaped()).unwrap_or(Value::Null);
            Ok(parsed)
        }
        None => Ok(Value::Null),
    }
}
