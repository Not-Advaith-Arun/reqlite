import { createSignal } from "solid-js";

export interface ToastMessage {
  id: number;
  text: string;
}

let nextId = 0;

const [toasts, setToasts] = createSignal<ToastMessage[]>([]);
export { toasts };

export function showToast(text: string, durationMs = 5000) {
  const id = nextId++;
  setToasts(prev => [...prev, { id, text }]);
  setTimeout(() => dismissToast(id), durationMs);
}

export function dismissToast(id: number) {
  setToasts(prev => prev.filter(t => t.id !== id));
}
