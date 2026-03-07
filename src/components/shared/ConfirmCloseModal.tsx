import { Component, createSignal } from "solid-js";
import { suppressCloseWarning } from "../../lib/session";

interface Props {
  tabName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmCloseModal: Component<Props> = (props) => {
  const [dontAsk, setDontAsk] = createSignal(false);

  const handleConfirm = () => {
    if (dontAsk()) suppressCloseWarning();
    props.onConfirm();
  };

  return (
    <div class="auth-code-overlay" onClick={props.onCancel}>
      <div class="auth-code-modal" onClick={(e) => e.stopPropagation()}>
        <div class="auth-code-header">
          <span>Unsaved Changes</span>
          <button class="icon-btn" onClick={props.onCancel}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" /></svg>
          </button>
        </div>
        <p class="auth-code-desc">
          "{props.tabName}" has unsaved changes that will be lost.
        </p>
        <label class="confirm-close-checkbox">
          <input
            type="checkbox"
            checked={dontAsk()}
            onChange={(e) => setDontAsk(e.currentTarget.checked)}
          />
          <span>Don't ask again</span>
        </label>
        <div class="auth-code-actions">
          <button class="btn-sm" onClick={props.onCancel}>Cancel</button>
          <button class="btn-sm btn-danger" onClick={handleConfirm}>Close Tab</button>
        </div>
      </div>
    </div>
  );
};
