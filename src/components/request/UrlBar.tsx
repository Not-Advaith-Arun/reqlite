import { Component } from "solid-js";

interface Props {
  method: string;
  url: string;
  loading: boolean;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export const UrlBar: Component<Props> = (props) => {
  return (
    <div class="url-bar">
      <select
        class={`method-select ${props.method.toLowerCase()}`}
        value={props.method}
        onChange={(e) => props.onMethodChange(e.currentTarget.value)}
      >
        {METHODS.map((m) => (
          <option value={m}>{m}</option>
        ))}
      </select>
      <input
        class="url-input"
        type="text"
        placeholder="Enter request URL..."
        value={props.url}
        onInput={(e) => props.onUrlChange(e.currentTarget.value)}
        onKeyDown={(e) => { if (e.key === "Enter") props.onSend(); }}
      />
      <button
        class={`send-btn ${props.loading ? "loading" : ""}`}
        onClick={props.onSend}
        disabled={props.loading}
      >
        {props.loading ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: "spin 0.7s linear infinite" }}>
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" opacity="0.3" />
            <path d="M14 8A6 6 0 0 0 8 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        ) : (
          <>
            Send
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style={{ "margin-left": "4px" }}>
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
};
