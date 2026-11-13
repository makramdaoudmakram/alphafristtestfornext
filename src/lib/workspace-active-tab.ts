/** Resolve which tab is active; heal missing or stale activeId when tabs exist. */
export function resolveWorkspaceActiveTabId(
  tabs: ReadonlyArray<{ clientId: string }>,
  activeId: string | null
): string | null {
  if (tabs.length === 0) return null;
  if (activeId != null && tabs.some((t) => t.clientId === activeId)) {
    return activeId;
  }
  return tabs[0]?.clientId ?? null;
}
