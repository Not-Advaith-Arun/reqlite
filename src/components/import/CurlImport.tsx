import { Component, createSignal } from "solid-js";
import { importCurl } from "../../lib/api";
import { openRequestInTab } from "../../stores/request";

interface Props {
  onClose: () => void;
  embedded?: boolean;
}

export const CurlImport: Component<Props> = (props) => {
  const [curlCmd, setCurlCmd] = createSignal("");
  const [error, setError] = createSignal("");

  const handleImport = async () => {
    try {
      setError("");
      const req = await importCurl(curlCmd());
      openRequestInTab(req);
      props.onClose();
    } catch (e) {
      setError(String(e));
    }
  };

  const content = () => (
    <>
      <div class="modal-body">
        <textarea
          class="curl-input"
          placeholder="Paste cURL command here..."
          value={curlCmd()}
          onInput={(e) => setCurlCmd(e.currentTarget.value)}
          rows={8}
        />
        {error() && <div class="import-error">{error()}</div>}
      </div>
      <div class="modal-footer">
        <button class="btn-primary" onClick={handleImport}>Import</button>
        <button class="btn-sm" onClick={props.onClose}>Cancel</button>
      </div>
    </>
  );

  if (props.embedded) return content();

  return (
    <div class="modal-overlay" onClick={props.onClose}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h3>Import cURL</h3>
          <button class="icon-btn" onClick={props.onClose}>x</button>
        </div>
        {content()}
      </div>
    </div>
  );
};
