const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Coach",
  analyst: "Analyst",
  viewer: "Viewer",
};

export function formatWorkspaceRole(role: string): string {
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}