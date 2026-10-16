export function draftHref(
  draft: { id: string; sourceTabId: number | null },
  writerId?: string,
) {
  const path =
    draft.sourceTabId !== null ? `/tab/${draft.sourceTabId}/edit` : "/create";
  const query = new URLSearchParams({ draft: draft.id });
  if (writerId) query.set("recovery", writerId);
  return `${path}?${query.toString()}`;
}

export function formatDraftDate(date: string | Date) {
  return new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
