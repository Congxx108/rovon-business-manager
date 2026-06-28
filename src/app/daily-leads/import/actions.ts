"use server";

import { revalidatePath } from "next/cache";
import { dailyLeadImportSummary, type ParsedDailyLeadImportRow } from "@/lib/imports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DailyLead } from "@/lib/types";

export type DailyLeadImportDifference = {
  stat_date: string;
  field: string;
  csvValue: number | null;
  systemValue: number;
};

export type DailyLeadImportState = {
  ok: boolean;
  message: string;
  summary?: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    importedRows: number;
    differences: DailyLeadImportDifference[];
  };
};

export type DailyLeadImportPreviewState = {
  existingDates: string[];
  differences: DailyLeadImportDifference[];
};

export async function getDailyLeadImportPreviewAction(rows: ParsedDailyLeadImportRow[]): Promise<DailyLeadImportPreviewState> {
  const validRows = rows.filter((row) => row.errors.length === 0);
  const rowsByDate = new Map<string, ParsedDailyLeadImportRow>();
  for (const row of validRows) rowsByDate.set(row.stat_date, row);
  const dedupedRows = Array.from(rowsByDate.values());

  if (!dedupedRows.length) return { existingDates: [], differences: [] };

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_leads")
    .select("id,stat_date,facebook_leads,whatsapp1,whatsapp2,total_increase,handbag_group,handbag_group_increase,backpack_group,backpack_group_increase");

  if (error) return { existingDates: [], differences: [] };

  const incomingDates = new Set(dedupedRows.map((row) => row.stat_date));
  const existingDates = ((data ?? []) as DailyLead[]).map((row) => row.stat_date).filter((date) => incomingDates.has(date));
  const mergedRows = new Map<string, DailyLeadPreviewRow>();

  for (const row of (data ?? []) as DailyLead[]) {
    mergedRows.set(row.stat_date, {
      stat_date: row.stat_date,
      facebook_leads: Number(row.facebook_leads ?? 0),
      whatsapp1: Number(row.whatsapp1 ?? 0),
      whatsapp2: Number(row.whatsapp2 ?? 0),
      handbag_group: Number(row.handbag_group ?? 0),
      backpack_group: Number(row.backpack_group ?? 0),
    });
  }

  for (const row of dedupedRows) {
    mergedRows.set(row.stat_date, {
      stat_date: row.stat_date,
      facebook_leads: row.facebook_leads,
      whatsapp1: row.whatsapp1,
      whatsapp2: row.whatsapp2,
      handbag_group: row.handbag_group,
      backpack_group: row.backpack_group,
    });
  }

  const calculatedRows = Array.from(mergedRows.values()).sort((a, b) => a.stat_date.localeCompare(b.stat_date));
  const calculatedByDate = new Map<string, { total: number; handbag: number; backpack: number }>();

  for (let index = 0; index < calculatedRows.length; index += 1) {
    const row = calculatedRows[index];
    const previous = calculatedRows[index - 1];
    calculatedByDate.set(row.stat_date, {
      total: previous ? row.facebook_leads + row.whatsapp1 + row.whatsapp2 - (previous.facebook_leads + previous.whatsapp1 + previous.whatsapp2) : 0,
      handbag: previous ? row.handbag_group - previous.handbag_group : 0,
      backpack: previous ? row.backpack_group - previous.backpack_group : 0,
    });
  }

  const differences: DailyLeadImportDifference[] = [];
  for (const row of dedupedRows) {
    const calculated = calculatedByDate.get(row.stat_date);
    if (!calculated) continue;
    compareDifference(differences, row.stat_date, "总增加数", row.csv_total_increase, calculated.total);
    compareDifference(differences, row.stat_date, "增加数-女包群", row.csv_handbag_group_increase, calculated.handbag);
    compareDifference(differences, row.stat_date, "增加数-双肩包群", row.csv_backpack_group_increase, calculated.backpack);
  }

  return { existingDates, differences: differences.slice(0, 20) };
}

export async function importDailyLeadsAction(
  _previousState: DailyLeadImportState | null,
  formData: FormData,
): Promise<DailyLeadImportState> {
  const rawRows = formData.get("rows");
  if (typeof rawRows !== "string" || !rawRows) {
    return { ok: false, message: "没有可导入的数据，请先选择 CSV 并确认预览。" };
  }

  let rows: ParsedDailyLeadImportRow[];
  try {
    rows = JSON.parse(rawRows) as ParsedDailyLeadImportRow[];
  } catch {
    return { ok: false, message: "导入数据格式无效，请重新选择 CSV。" };
  }

  const validRows = rows.filter((row) => row.errors.length === 0);
  if (!validRows.length) {
    return { ok: false, message: "没有通过校验的每日潜客行。" };
  }
  const preserveCsvIncreases = formData.get("preserve_csv_increases") === "on";

  const rowsByDate = new Map<string, ParsedDailyLeadImportRow>();
  for (const row of validRows) rowsByDate.set(row.stat_date, row);
  const dedupedRows = Array.from(rowsByDate.values());

  const supabase = getSupabaseAdminClient();
  const payload = dedupedRows.map((row) => ({
    stat_date: row.stat_date,
    facebook_leads: row.facebook_leads,
    whatsapp1: row.whatsapp1,
    whatsapp2: row.whatsapp2,
    handbag_group: row.handbag_group,
    backpack_group: row.backpack_group,
    total_increase_override: preserveCsvIncreases ? row.csv_total_increase : null,
    handbag_group_increase_override: preserveCsvIncreases ? row.csv_handbag_group_increase : null,
    backpack_group_increase_override: preserveCsvIncreases ? row.csv_backpack_group_increase : null,
    increase_note: preserveCsvIncreases ? "导入时保留 CSV 增加数作为手动修正值" : null,
  }));

  const { error } = await supabase.from("daily_leads").upsert(payload, { onConflict: "stat_date" });
  if (error) return { ok: false, message: `每日潜客导入失败：${error.message}` };

  const { error: recalculateError } = await supabase.rpc("recalculate_daily_leads");
  if (recalculateError) return { ok: false, message: `增量重算失败：${recalculateError.message}` };

  const dates = dedupedRows.map((row) => row.stat_date);
  const { data, error: selectError } = await supabase.from("daily_leads").select("*").in("stat_date", dates);
  if (selectError) return { ok: false, message: `读取校验结果失败：${selectError.message}` };

  const systemRows = new Map((data ?? []).map((row) => [(row as DailyLead).stat_date, row as DailyLead]));
  const differences: DailyLeadImportDifference[] = [];

  for (const row of dedupedRows) {
    const system = systemRows.get(row.stat_date);
    if (!system) continue;
    compareDifference(differences, row.stat_date, "总增加数", row.csv_total_increase, system.total_increase);
    compareDifference(differences, row.stat_date, "增加数-女包群", row.csv_handbag_group_increase, system.handbag_group_increase);
    compareDifference(differences, row.stat_date, "增加数-双肩包群", row.csv_backpack_group_increase, system.backpack_group_increase);
  }

  revalidatePath("/daily-leads");
  revalidatePath("/dashboard");
  revalidatePath("/data-check");

  return {
    ok: true,
    message: preserveCsvIncreases
      ? "每日潜客导入完成，已保留 CSV 增加数作为手动修正值。"
      : differences.length
        ? "每日潜客导入完成，发现部分 CSV 增量与系统计算不一致。"
        : "每日潜客导入完成，CSV 增量与系统计算一致。",
    summary: {
      ...dailyLeadImportSummary(rows),
      importedRows: dedupedRows.length,
      differences: differences.slice(0, 20),
    },
  };
}

type DailyLeadPreviewRow = {
  stat_date: string;
  facebook_leads: number;
  whatsapp1: number;
  whatsapp2: number;
  handbag_group: number;
  backpack_group: number;
};

function compareDifference(
  differences: DailyLeadImportDifference[],
  statDate: string,
  field: string,
  csvValue: number | null,
  systemValue: number,
) {
  if (csvValue === null) return;
  if (csvValue !== systemValue) {
    differences.push({ stat_date: statDate, field, csvValue, systemValue });
  }
}
