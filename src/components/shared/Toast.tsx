import { Component, For } from "solid-js";
import { toasts, dismissToast } from "../../stores/toast";

export const ToastContainer: Component = () => {
  return (
    <div class="toast-container">
      <For each={toasts()}>
        {(toast) => (
          <div class="toast-item">
            <span class="toast-text">{toast.text}</span>
            <button class="toast-dismiss" onClick={() => dismissToast(toast.id)}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
              </svg>
            </button>
          </div>
        )}
      </For>
    </div>
  );
};
