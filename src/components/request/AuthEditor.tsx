import { Component, Match, Switch } from "solid-js";
import type { AuthConfig } from "../../lib/api";

interface Props {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

type AuthType = "none" | "bearer" | "basic" | "api_key";

// Helpers to narrow the discriminated union for type-safe property access
function bearerConfig(auth: AuthConfig) {
  return auth.type === "bearer" ? auth.config : { token: "" };
}

function basicConfig(auth: AuthConfig) {
  return auth.type === "basic" ? auth.config : { username: "", password: "" };
}

function apiKeyConfig(auth: AuthConfig) {
  return auth.type === "api_key" ? auth.config : { key: "", value: "", add_to: "header" };
}

export const AuthEditor: Component<Props> = (props) => {
  const authType = (): AuthType => props.auth.type as AuthType;

  return (
    <div class="auth-editor">
      <div class="auth-type-selector">
        <select
          class="auth-select"
          value={authType()}
          onChange={(e) => {
            const type = e.currentTarget.value as AuthType;
            switch (type) {
              case "none": props.onChange({ type: "none" }); break;
              case "bearer": props.onChange({ type: "bearer", config: { token: "" } }); break;
              case "basic": props.onChange({ type: "basic", config: { username: "", password: "" } }); break;
              case "api_key": props.onChange({ type: "api_key", config: { key: "", value: "", add_to: "header" } }); break;
            }
          }}
        >
          <option value="none">No Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="api_key">API Key</option>
        </select>
      </div>

      <div class="auth-config">
        <Switch>
          <Match when={authType() === "none"}>
            <div class="auth-empty">No authentication configured for this request.</div>
          </Match>
          <Match when={authType() === "bearer"}>
            <div class="auth-field">
              <label>Token</label>
              <input
                type="text"
                class="auth-input"
                placeholder="Enter bearer token..."
                value={bearerConfig(props.auth).token}
                onInput={(e) => props.onChange({ type: "bearer", config: { token: e.currentTarget.value } })}
              />
            </div>
          </Match>
          <Match when={authType() === "basic"}>
            <div class="auth-field">
              <label>Username</label>
              <input
                type="text"
                class="auth-input"
                placeholder="Username"
                value={basicConfig(props.auth).username}
                onInput={(e) => props.onChange({ type: "basic", config: { ...basicConfig(props.auth), username: e.currentTarget.value } })}
              />
            </div>
            <div class="auth-field">
              <label>Password</label>
              <input
                type="password"
                class="auth-input"
                placeholder="Password"
                value={basicConfig(props.auth).password}
                onInput={(e) => props.onChange({ type: "basic", config: { ...basicConfig(props.auth), password: e.currentTarget.value } })}
              />
            </div>
          </Match>
          <Match when={authType() === "api_key"}>
            <div class="auth-field">
              <label>Key</label>
              <input
                type="text"
                class="auth-input"
                placeholder="e.g. X-API-Key"
                value={apiKeyConfig(props.auth).key}
                onInput={(e) => props.onChange({ type: "api_key", config: { ...apiKeyConfig(props.auth), key: e.currentTarget.value } })}
              />
            </div>
            <div class="auth-field">
              <label>Value</label>
              <input
                type="text"
                class="auth-input"
                placeholder="API key value"
                value={apiKeyConfig(props.auth).value}
                onInput={(e) => props.onChange({ type: "api_key", config: { ...apiKeyConfig(props.auth), value: e.currentTarget.value } })}
              />
            </div>
            <div class="auth-field">
              <label>Add to</label>
              <select
                class="auth-select"
                value={apiKeyConfig(props.auth).add_to}
                onChange={(e) => props.onChange({ type: "api_key", config: { ...apiKeyConfig(props.auth), add_to: e.currentTarget.value } })}
              >
                <option value="header">Header</option>
                <option value="query">Query Param</option>
              </select>
            </div>
          </Match>
        </Switch>
      </div>
    </div>
  );
};
