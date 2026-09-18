import type { DailyLead } from "@/lib/types";

export type DailyLeadWithFacebookMetrics = DailyLead & {
  facebook_increase: number;
  facebook_share: number | null;
};

export function facebookShare(increase: number, total: number): number | null {
  if (!Number.isFinite(increase) || !Number.isFinite(total) || total <= 0 || increase < 0 || increase > total) return null;
  return (increase / total) * 100;
}

// Rows are newest first and include one extra predecessor before the display limit.
export function withFacebookMetrics(rows: DailyLead[]): DailyLeadWithFacebookMetrics[] {
  return rows.map((row, index) => {
    const previous = rows[index + 1];
    const increase = previous ? row.facebook_leads - previous.facebook_leads : 0;
    return { ...row, facebook_increase: increase, facebook_share: facebookShare(increase, row.total_increase) };
  });
}

export function formatFacebookShare(value: number | null): string {
  return value === null ? "-" : `${Number(value.toFixed(1))}%`;
}
