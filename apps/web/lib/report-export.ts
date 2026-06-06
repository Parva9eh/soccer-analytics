import { apiFetch, ApiError } from "@/lib/api";

export async function downloadReportCsv(reportId: string, title: string) {
  const res = await apiFetch(`/reports/${reportId}/export`);
  if (!res.ok) {
    throw await ApiError.fromResponse(res);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = slug ? `report-${slug}.csv` : `report-${reportId}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}