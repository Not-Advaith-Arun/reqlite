import { Component, Show, For, createSignal, createEffect, onCleanup, createMemo } from "solid-js";
import type { Tab, WsMessage } from "../../stores/request";
import { clearWsMessages } from "../../stores/request";

interface Props {
  tab: Tab;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toTimeString().slice(0, 8); // HH:MM:SS
}

function tryPrettyJson(content: string): string | null {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return null;
  }
}

export const WsMessageStream: Component<Props> = (props) => {
  const [search, setSearch] = createSignal("");
  const [autoScroll, setAutoScroll] = createSignal(true);
  const [expandedIds, setExpandedIds] = createSignal<Set<string>>(new Set());

  let listRef: HTMLDivElement | undefined;

  const filteredMessages = createMemo(() => {
    const term = search().toLowerCase();
    if (!term) return props.tab.wsMessages;
    return props.tab.wsMessages.filter((m) => m.content.toLowerCase().includes(term));
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Auto-scroll when new messages arrive
  createEffect(() => {
    const _len = props.tab.wsMessages.length;
    if (autoScroll() && listRef) {
      queueMicrotask(() => {
        listRef!.scrollTop = listRef!.scrollHeight;
      });
    }
  });

  const handleScroll = () => {
    if (!listRef) return;
    const atBottom = listRef.scrollHeight - listRef.scrollTop - listRef.clientHeight < 30;
    setAutoScroll(atBottom);
  };

  const statusText = () => {
    switch (props.tab.wsStatus) {
      case "connected": return "Connected";
      case "connecting": return "Connecting";
      case "disconnected": return "Disconnected";
    }
  };

  return (
    <div class="ws-message-stream">
      <div class="ws-stream-header">
        <div class="ws-stream-status">
          <span class={`ws-stream-status-dot ${props.tab.wsStatus}`} />
          <span>{statusText()}</span>
        </div>
        <span class="ws-stream-msg-count">{props.tab.wsMessages.length} msgs</span>
        <input
          class="ws-stream-search"
          type="text"
          placeholder="Filter messages..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
        />
        <button
          class={`ws-stream-btn ${autoScroll() ? "active" : ""}`}
          onClick={() => setAutoScroll(!autoScroll())}
          title="Auto-scroll"
        >
          Auto-scroll
        </button>
        <button
          class="ws-stream-btn"
          onClick={() => clearWsMessages(props.tab.id)}
          title="Clear messages"
        >
          Clear
        </button>
      </div>

      <Show when={filteredMessages().length > 0} fallback={
        <div class="ws-stream-empty">
          <Show when={props.tab.wsStatus === "disconnected"} fallback={
            <span>Waiting for messages...</span>
          }>
            <span>Connect to start receiving messages</span>
          </Show>
        </div>
      }>
        <div class="ws-stream-list" ref={listRef} onScroll={handleScroll}>
          <For each={filteredMessages()}>
            {(msg) => {
              const isExpanded = () => expandedIds().has(msg.id);
              const dirClass = () =>
                msg.direction === "sent" ? "ws-msg-sent" :
                msg.direction === "received" ? "ws-msg-received" : "ws-msg-system";
              const dirIcon = () =>
                msg.direction === "sent" ? "\u25B2" :
                msg.direction === "received" ? "\u25BC" : "\u25CF";
              const prettyJson = () => isExpanded() ? tryPrettyJson(msg.content) : null;

              return (
                <div class={`ws-message-row ${dirClass()}`} onClick={() => toggleExpand(msg.id)}>
                  <span class="ws-msg-direction">{dirIcon()}</span>
                  <span class="ws-msg-time">{formatTime(msg.timestamp)}</span>
                  <div class={`ws-msg-content ${isExpanded() ? "ws-msg-expanded" : ""}`}>
                    <Show when={isExpanded()} fallback={
                      <span>{msg.content.length > 200 ? msg.content.slice(0, 200) + "\u2026" : msg.content}</span>
                    }>
                      <Show when={prettyJson()} fallback={<span>{msg.content}</span>}>
                        <pre>{prettyJson()}</pre>
                      </Show>
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};
