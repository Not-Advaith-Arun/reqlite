import { Component, Show, createSignal } from "solid-js";
import { submitAuthCode, cancelCodeEntry, authLoading, authError } from "../../lib/auth";

export const AuthCodeModal: Component = () => {
  const [code, setCode] = createSignal("");

  const handleSubmit = () => {
    const c = code().trim();
    if (c) submitAuthCode(c);
  };

  return (
    <div class="auth-code-overlay" onClick={cancelCodeEntry}>
      <div class="auth-code-modal" onClick={(e) => e.stopPropagation()}>
        <div class="auth-code-header">
          <span>Enter sign-in code</span>
          <button class="icon-btn" onClick={cancelCodeEntry}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" /></svg>
          </button>
        </div>
        <p class="auth-code-desc">
          Copy the code from the browser page that opened after GitHub sign-in.
        </p>
        <Show when={authError()}>
          <p class="auth-code-error">{authError()}</p>
        </Show>
        <input
          class="auth-code-input"
          type="text"
          placeholder="Paste code here..."
          value={code()}
          onInput={(e) => setCode(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") cancelCodeEntry(); }}
          autofocus
        />
        <div class="auth-code-actions">
          <button class="btn-sm" onClick={cancelCodeEntry}>Cancel</button>
          <button class="btn-sm btn-primary" onClick={handleSubmit} disabled={authLoading() || !code().trim()}>
            {authLoading() ? "Verifying..." : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};
