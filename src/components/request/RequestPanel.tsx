import { Component, Show, createSignal, createMemo } from "solid-js";
import { UrlBar } from "./UrlBar";
import { KeyValueGrid, COMMON_HEADERS } from "../shared/KeyValueGrid";
import { BodyEditor } from "./BodyEditor";
import { AuthEditor } from "./AuthEditor";
import type { Tab } from "../../stores/request";
import type { KeyValue, RequestBody, AuthConfig } from "../../lib/api";

function parseQueryParams(url: string): KeyValue[] {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return [];
  const queryStr = url.slice(qIdx + 1);
  const params: KeyValue[] = [];
  for (const pair of queryStr.split("&")) {
    if (!pair) continue;
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) {
      params.push({ key: decodeURIComponent(pair), value: "", enabled: true });
    } else {
      params.push({
        key: decodeURIComponent(pair.slice(0, eqIdx)),
        value: decodeURIComponent(pair.slice(eqIdx + 1)),
        enabled: true,
      });
    }
  }
  return params;
}

function buildUrlWithParams(baseUrl: string, params: KeyValue[]): string {
  const enabled = params.filter(p => p.enabled && p.key);
  if (enabled.length === 0) return baseUrl;
  const qs = enabled.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join("&");
  return `${baseUrl}?${qs}`;
}

function getBaseUrl(url: string): string {
  const qIdx = url.indexOf("?");
  return qIdx === -1 ? url : url.slice(0, qIdx);
}

interface Props {
  tab: Tab;
  onUpdate: (updates: Partial<Tab>) => void;
  onSend: () => void;
}

type RequestTab = "params" | "headers" | "body" | "auth" | "scripts";

export const RequestPanel: Component<Props> = (props) => {
  const [activeSection, setActiveSection] = createSignal<RequestTab>("params");

  const handleUrlChange = (url: string) => {
    const params = parseQueryParams(url);
    props.onUpdate({ url, params });
  };

  const handleParamsChange = (params: KeyValue[]) => {
    const base = getBaseUrl(props.tab.url);
    const url = buildUrlWithParams(base, params);
    props.onUpdate({ params, url });
  };

  return (
    <div class="request-panel">
      <UrlBar
        method={props.tab.method}
        url={props.tab.url}
        protocol={props.tab.protocol}
        loading={props.tab.loading}
        onMethodChange={(method) => props.onUpdate({ method })}
        onUrlChange={handleUrlChange}
        onProtocolChange={(protocol) => props.onUpdate({ protocol })}
        onSend={props.onSend}
        onCurlPaste={(parsed) => {
          props.onUpdate({
            method: parsed.method,
            url: parsed.url,
            headers: parsed.headers,
            params: parsed.params,
            body: parsed.body,
            auth: parsed.auth,
            name: `${parsed.method} ${parsed.url}`,
          });
        }}
      />

      <div class="request-tabs">
        {(["params", "headers", "body", "auth", "scripts"] as RequestTab[]).map((tab) => (
          <button
            class={`request-tab ${activeSection() === tab ? "active" : ""}`}
            onClick={() => setActiveSection(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <Show when={tab === "params" && props.tab.params.length > 0}>
              <span class="tab-count">{props.tab.params.filter(p => p.enabled).length}</span>
            </Show>
            <Show when={tab === "headers" && props.tab.headers.length > 0}>
              <span class="tab-count">{props.tab.headers.filter(h => h.enabled).length}</span>
            </Show>
          </button>
        ))}
      </div>

      <div class="request-content">
        <Show when={activeSection() === "params"}>
          <KeyValueGrid
            items={props.tab.params}
            onChange={handleParamsChange}
            placeholder={{ key: "Parameter", value: "Value" }}
          />
        </Show>
        <Show when={activeSection() === "headers"}>
          <KeyValueGrid
            items={props.tab.headers}
            onChange={(headers) => props.onUpdate({ headers })}
            placeholder={{ key: "Header", value: "Value" }}
            keySuggestions={COMMON_HEADERS}
          />
        </Show>
        <Show when={activeSection() === "body"}>
          <BodyEditor
            body={props.tab.body}
            onChange={(body) => props.onUpdate({ body })}
          />
        </Show>
        <Show when={activeSection() === "auth"}>
          <AuthEditor
            auth={props.tab.auth}
            onChange={(auth) => props.onUpdate({ auth })}
          />
        </Show>
        <Show when={activeSection() === "scripts"}>
          <div class="scripts-editor">
            <div class="script-section">
              <label class="script-label">Pre-request Script</label>
              <textarea
                class="script-textarea"
                placeholder="// Pre-request script (JavaScript)&#10;// Use pm.variables.set('key', 'value')"
                value={props.tab.preScript}
                onInput={(e) => props.onUpdate({ preScript: e.currentTarget.value })}
              />
            </div>
            <div class="script-section">
              <label class="script-label">Post-response Script</label>
              <textarea
                class="script-textarea"
                placeholder="// Post-response script (JavaScript)&#10;// Use pm.response.json() to access response"
                value={props.tab.postScript}
                onInput={(e) => props.onUpdate({ postScript: e.currentTarget.value })}
              />
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};
