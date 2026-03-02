import { Component, For, Show, createSignal, onMount, onCleanup, createEffect } from "solid-js";
import { tabs, activeTabId, setActiveTabId, closeTab, createNewTab, closeAllTabs, closeOtherTabs, type Tab } from "../../stores/request";

const METHOD_ORDER = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export const TabBar: Component = () => {
  let tabListRef: HTMLDivElement | undefined;
  const [canScrollLeft, setCanScrollLeft] = createSignal(false);
  const [canScrollRight, setCanScrollRight] = createSignal(false);
  const [showDropdown, setShowDropdown] = createSignal(false);
  const [groupByMethod, setGroupByMethod] = createSignal(false);

  const checkOverflow = () => {
    if (!tabListRef) return;
    setCanScrollLeft(tabListRef.scrollLeft > 0);
    setCanScrollRight(tabListRef.scrollLeft + tabListRef.clientWidth < tabListRef.scrollWidth - 1);
  };

  onMount(() => {
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    if (tabListRef) observer.observe(tabListRef);
    onCleanup(() => observer.disconnect());
  });

  createEffect(() => {
    tabs();
    setTimeout(checkOverflow, 0);
  });

  const scrollLeft = () => {
    tabListRef?.scrollBy({ left: -200, behavior: "smooth" });
  };

  const scrollRight = () => {
    tabListRef?.scrollBy({ left: 200, behavior: "smooth" });
  };

  const handleScroll = () => checkOverflow();

  const groupedTabs = (): { label: string; tabs: Tab[] }[] => {
    if (!groupByMethod()) return [{ label: "", tabs: tabs() }];
    const groups = new Map<string, Tab[]>();
    for (const tab of tabs()) {
      const method = tab.method.toUpperCase();
      if (!groups.has(method)) groups.set(method, []);
      groups.get(method)!.push(tab);
    }
    return METHOD_ORDER
      .filter(m => groups.has(m))
      .map(m => ({ label: m, tabs: groups.get(m)! }))
      .concat(
        [...groups.entries()]
          .filter(([m]) => !METHOD_ORDER.includes(m))
          .map(([m, t]) => ({ label: m, tabs: t }))
      );
  };

  const closeDropdownOnClick = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest(".tab-menu-container")) {
      setShowDropdown(false);
    }
  };

  onMount(() => {
    document.addEventListener("click", closeDropdownOnClick);
    onCleanup(() => document.removeEventListener("click", closeDropdownOnClick));
  });

  return (
    <div class="tab-bar">
      <Show when={canScrollLeft()}>
        <button class="tab-scroll-btn" onClick={scrollLeft} title="Scroll left">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="8 2 4 6 8 10" />
          </svg>
        </button>
      </Show>

      <div class="tab-list" ref={tabListRef} onScroll={handleScroll}>
        <For each={groupedTabs()}>
          {(group) => (
            <>
              <Show when={groupByMethod() && group.label}>
                <div class="tab-group-divider">
                  <span class="tab-group-label">{group.label}</span>
                </div>
              </Show>
              <For each={group.tabs}>
                {(tab) => (
                  <div
                    class={`tab-item ${tab.id === activeTabId() ? "active" : ""}`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <span class={`tab-method ${tab.method.toLowerCase()}`}>
                      {tab.method}
                    </span>
                    <span class="tab-name">{tab.name}</span>
                    <Show when={tab.dirty}>
                      <span class="tab-dirty">●</span>
                    </Show>
                    <button
                      class="tab-close"
                      onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                        <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
                      </svg>
                    </button>
                  </div>
                )}
              </For>
            </>
          )}
        </For>
      </div>

      <Show when={canScrollRight()}>
        <button class="tab-scroll-btn" onClick={scrollRight} title="Scroll right">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 2 8 6 4 10" />
          </svg>
        </button>
      </Show>

      <button class="tab-new" onClick={() => createNewTab()} title="New tab">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="7" y1="2" x2="7" y2="12" /><line x1="2" y1="7" x2="12" y2="7" />
        </svg>
      </button>

      <div class="tab-menu-container">
        <button
          class="tab-new"
          onClick={() => setShowDropdown(!showDropdown())}
          title="Tab options"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <circle cx="7" cy="3" r="1" fill="currentColor" /><circle cx="7" cy="7" r="1" fill="currentColor" /><circle cx="7" cy="11" r="1" fill="currentColor" />
          </svg>
        </button>
        <Show when={showDropdown()}>
          <div class="tab-dropdown">
            <button
              class="tab-dropdown-item"
              onClick={() => { closeAllTabs(); setShowDropdown(false); }}
            >
              Close All Tabs
            </button>
            <Show when={activeTabId()}>
              <button
                class="tab-dropdown-item"
                onClick={() => { closeOtherTabs(activeTabId()!); setShowDropdown(false); }}
              >
                Close Other Tabs
              </button>
            </Show>
            <div class="tab-dropdown-sep" />
            <button
              class={`tab-dropdown-item ${groupByMethod() ? "active" : ""}`}
              onClick={() => { setGroupByMethod(!groupByMethod()); setShowDropdown(false); }}
            >
              {groupByMethod() ? "✓ " : ""}Group by Method
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
};
