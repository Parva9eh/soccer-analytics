import type {
  CompareMatchesResult,
  CompareMode,
  ComparePlayersResult,
  CompareTeamsResult,
} from "@/lib/profile-types";
import { formatXg } from "@/lib/xg-types";

type ExportRow = {
  metric: string;
  left: string;
  right: string;
};

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function playerRows(result: ComparePlayersResult): ExportRow[] {
  const { player_a: a, player_b: b } = result;
  return [
    { metric: "Goals", left: String(a.goals), right: String(b.goals) },
    { metric: "xG", left: formatXg(a.xg), right: formatXg(b.xg) },
    { metric: "Shots", left: String(a.shots), right: String(b.shots) },
    { metric: "Passes", left: String(a.passes), right: String(b.passes) },
    {
      metric: "Completed passes",
      left: String(a.completed_passes),
      right: String(b.completed_passes),
    },
    {
      metric: "Progressive passes",
      left: String(a.progressive_passes),
      right: String(b.progressive_passes),
    },
    {
      metric: "Matches with events",
      left: String(a.matches_with_events),
      right: String(b.matches_with_events),
    },
  ];
}

function teamRows(result: CompareTeamsResult): ExportRow[] {
  const { team_a: a, team_b: b } = result;
  return [
    { metric: "Goals for", left: String(a.goals_for), right: String(b.goals_for) },
    {
      metric: "Goals against",
      left: String(a.goals_against),
      right: String(b.goals_against),
    },
    { metric: "xG for", left: formatXg(a.xg_for), right: formatXg(b.xg_for) },
    {
      metric: "xG against",
      left: formatXg(a.xg_against),
      right: formatXg(b.xg_against),
    },
    { metric: "Passes", left: String(a.passes), right: String(b.passes) },
    {
      metric: "Progressive passes",
      left: String(a.progressive_passes),
      right: String(b.progressive_passes),
    },
    {
      metric: "Passes / possession",
      left: a.avg_passes_per_possession.toFixed(1),
      right: b.avg_passes_per_possession.toFixed(1),
    },
    {
      metric: "Shot possession rate",
      left: `${(a.shot_possession_rate * 100).toFixed(1)}%`,
      right: `${(b.shot_possession_rate * 100).toFixed(1)}%`,
    },
  ];
}

function matchRows(result: CompareMatchesResult): ExportRow[] {
  const { match_a: a, match_b: b } = result;
  const totalXg = (match: CompareMatchesResult["match_a"]) =>
    formatXg(match.home_xg + match.away_xg);
  return [
    { metric: "Total xG", left: totalXg(a), right: totalXg(b) },
    { metric: "Shots", left: String(a.shots), right: String(b.shots) },
    { metric: "Passes", left: String(a.passes), right: String(b.passes) },
    {
      metric: "Progressive passes",
      left: String(a.progressive_passes),
      right: String(b.progressive_passes),
    },
    {
      metric: "Possession sequences",
      left: String(a.possession_sequences),
      right: String(b.possession_sequences),
    },
    {
      metric: "Set-piece events",
      left: String(a.set_piece_events),
      right: String(b.set_piece_events),
    },
    {
      metric: "Counter events",
      left: String(a.counter_events),
      right: String(b.counter_events),
    },
    {
      metric: "Final-third events",
      left: String(a.final_third_events),
      right: String(b.final_third_events),
    },
    { metric: "Total events", left: String(a.total_events), right: String(b.total_events) },
  ];
}

export function buildCompareExport(
  mode: CompareMode,
  data: ComparePlayersResult | CompareTeamsResult | CompareMatchesResult,
): { leftLabel: string; rightLabel: string; rows: ExportRow[] } | null {
  if (mode === "players") {
    const result = data as ComparePlayersResult;
    return {
      leftLabel: result.player_a.player_name,
      rightLabel: result.player_b.player_name,
      rows: playerRows(result),
    };
  }
  if (mode === "teams") {
    const result = data as CompareTeamsResult;
    return {
      leftLabel: result.team_a.team,
      rightLabel: result.team_b.team,
      rows: teamRows(result),
    };
  }
  if (mode === "matches") {
    const result = data as CompareMatchesResult;
    return {
      leftLabel: result.match_a.label,
      rightLabel: result.match_b.label,
      rows: matchRows(result),
    };
  }
  return null;
}

export function downloadCompareCsv(
  mode: CompareMode,
  data: ComparePlayersResult | CompareTeamsResult | CompareMatchesResult,
  scopeLabel: string,
) {
  const payload = buildCompareExport(mode, data);
  if (!payload) {
    return;
  }

  const lines = [
    `Compare export — ${scopeLabel}`,
    `Mode,${escapeCsv(mode)}`,
    `Left,${escapeCsv(payload.leftLabel)}`,
    `Right,${escapeCsv(payload.rightLabel)}`,
    "",
    `Metric,${escapeCsv(payload.leftLabel)},${escapeCsv(payload.rightLabel)}`,
    ...payload.rows.map(
      (row) =>
        `${escapeCsv(row.metric)},${escapeCsv(row.left)},${escapeCsv(row.right)}`,
    ),
  ];

  const slug = scopeLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  downloadTextFile(lines.join("\n"), `compare-${mode}-${slug || "export"}.csv`, "text/csv");
}

export async function downloadSvgAsPng(
  svg: SVGSVGElement,
  filename: string,
  scale = 2,
) {
  const cloned = svg.cloneNode(true) as SVGSVGElement;
  const bbox = svg.getBoundingClientRect();
  const width = bbox.width || 220;
  const height = bbox.height || 220;
  cloned.setAttribute("width", String(width));
  cloned.setAttribute("height", String(height));

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(cloned);
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to render SVG"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas unavailable");
    }
    context.fillStyle = "#0c1929";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngUrl = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = pngUrl;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}