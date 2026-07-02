/** Link to workspace data-access settings when an active workspace is known. */
export function workspaceManageHref(workspaceId?: string): string {
  return workspaceId
    ? `/settings/workspaces/${workspaceId}`
    : "/settings";
}

export const NO_LINKED_DATASETS_TITLE = "No data linked to this workspace";

export function noLinkedDatasetsDescription(): string {
  return "Link a competition season under Settings → Manage → Data access to unlock matches, analytics, reports, and saved views. New workspaces usually start with La Liga 2020/21 when that data is loaded.";
}