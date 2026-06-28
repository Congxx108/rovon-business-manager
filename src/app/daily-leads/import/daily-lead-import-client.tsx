"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  getDailyLeadImportPreviewAction,
  importDailyLeadsAction,
  type DailyLeadImportPreviewState,
  type DailyLeadImportState,
} from "@/app/daily-leads/import/actions";
import {
  DAILY_LEAD_CSV_FIELD_ALIASES,
  DAILY_LEAD_CSV_FIELD_LABELS,
  parseCsvFile,
  type CsvParseResult,
  type CsvRecord,
} from "@/lib/csv";
import { dailyLeadImportSummary, mapDailyLeadImportRows, type ParsedDailyLeadImportRow } from "@/lib/imports";
import { formatNumber } from "@/lib/format";

export function DailyLeadImportClient() {
  const [records, setRecords] = useState<CsvRecord[]>([]);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [importPreview, setImportPreview] = useState<DailyLeadImportPreviewState>({ existingDates: [], differences: [] });
  const [fileError, setFileError] = useState("");
  const [state, formAction, pending] = useActionState<DailyLeadImportState | null, FormData>(importDailyLeadsAction, null);
  const rows = useMemo(() => mapDailyLeadImportRows(records), [records]);
  const summary = dailyLeadImportSummary(rows);
  const validRows = rows.filter((row) => row.errors.length === 0);
  const validRowsKey = JSON.stringify(validRows);
  const existingDates = new Set(importPreview.existingDates);
  const uniqueValidDates = Array.from(new Set(validRows.map((row) => row.stat_date)));
  const estimatedUpdates = uniqueValidDates.filter((date) => existingDates.has(date)).length;
  const estimatedCreates = uniqueValidDates.length - estimatedUpdates;
  const previewDifferences = validRows.length ? importPreview.differences : [];

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileError("");
    setRecords([]);
    setParseResult(null);
    setImportPreview({ existingDates: [], differences: [] });

    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("第三阶段先支持 CSV，请把 Excel 另存为 CSV 后再导入。");
      return;
    }

    try {
      const result = await parseCsvFile(file, DAILY_LEAD_CSV_FIELD_ALIASES);
      if (result.error) {
        setFileError(result.error);
        return;
      }

      setParseResult(result);
      setRecords(result.records);
    } catch {
      setFileError("CSV 解析失败，请确认文件格式。");
    }
  }

  useEffect(() => {
    let cancelled = false;
    const previewRows = validRowsKey ? (JSON.parse(validRowsKey) as ParsedDailyLeadImportRow[]) : [];

    if (!previewRows.length) {
      return;
    }

    getDailyLeadImportPreviewAction(previewRows).then((result) => {
      if (!cancelled) setImportPreview(result);
    });

    return () => {
      cancelled = true;
    };
  }, [validRowsKey]);

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <label className="block text-sm font-medium text-slate-700">
          CSV 文件
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="mt-2 block w-full text-sm text-slate-700" />
          <DownloadDailyLeadTemplateButton />
        </label>
        <p className="mt-3 text-xs text-slate-500">模板中的三个增加数字段可以用于校验，也可以在导入时保留为手动修正值。</p>
        {fileError ? <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{fileError}</div> : null}
      </div>

      {records.length ? (
        <>
          {parseResult ? <CsvParseInfo result={parseResult} /> : null}

          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label="总行数" value={formatNumber(summary.totalRows)} />
            <SummaryCard label="可导入行数" value={formatNumber(summary.validRows)} />
            <SummaryCard label="缺少/错误行数" value={formatNumber(summary.errorRows)} />
          </div>

          <form action={formAction} className="rounded-md border border-slate-200 bg-white p-5">
            <textarea name="rows" value={JSON.stringify(rows)} readOnly hidden />
            <label className="mb-4 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <input name="preserve_csv_increases" type="checkbox" defaultChecked className="mt-0.5 h-4 w-4 rounded border-blue-300" />
              <span>
                <span className="font-medium">保留 CSV 中的每日增加数作为手动修正值</span>
                <span className="mt-1 block text-xs leading-5">
                  适合历史数据中存在换群、WhatsApp2 中途启用、人工修正等情况。勾选后，CSV 的增加数会写入手动修正字段，Dashboard 趋势会优先使用这些增加数。
                </span>
              </span>
            </label>
            <ImportConfirmDetails
              parseResult={parseResult}
              rows={rows}
              estimatedCreates={estimatedCreates}
              estimatedUpdates={estimatedUpdates}
              differences={previewDifferences}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">同日期记录会更新已有数据；导入后系统会重新计算三个最终增加数字段。</p>
              <button
                type="submit"
                disabled={!validRows.length || pending}
                className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {pending ? "导入中..." : "确认导入每日潜客"}
              </button>
            </div>
          </form>

          {state ? (
            <div className={`rounded-md border px-4 py-3 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {state.message}
            </div>
          ) : null}

          {state?.summary?.differences.length ? <DifferenceTable title="导入后前 20 条增量差异" differences={state.summary.differences} /> : null}
          <PreviewTable rows={rows} />
        </>
      ) : null}
    </div>
  );
}

function DownloadDailyLeadTemplateButton() {
  return (
    <button
      type="button"
      onClick={() =>
        downloadCsv(
          "rovon-daily-leads-import-template.csv",
          "日期,客户,WhatsApp1,WhatsApp2,总增加数,女包群,增加数-女包群,书包群人数,增加数-双肩包群\r\n2026-06-27,3250,3200,1380,57,130,4,668,1\r\n",
        )
      }
      className="mt-3 inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      下载每日潜客导入模板
    </button>
  );
}

function CsvParseInfo({ result }: { result: CsvParseResult }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 text-sm">
      <div className="font-medium text-slate-950">CSV 识别结果</div>
      <div className="mt-3 text-slate-700">当前识别到的编码：{result.encoding}</div>
      <div className="mt-3">
        <div className="text-xs text-slate-500">成功识别到的字段映射</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {result.matchedFields.map((item) => (
            <span key={item.field} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
              {DAILY_LEAD_CSV_FIELD_LABELS[item.field as keyof typeof DAILY_LEAD_CSV_FIELD_LABELS] ?? item.field} = {item.header}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImportConfirmDetails({
  parseResult,
  rows,
  estimatedCreates,
  estimatedUpdates,
  differences,
}: {
  parseResult: CsvParseResult | null;
  rows: ParsedDailyLeadImportRow[];
  estimatedCreates: number;
  estimatedUpdates: number;
  differences: NonNullable<DailyLeadImportState["summary"]>["differences"];
}) {
  const errorRows = rows.filter((row) => row.errors.length > 0).slice(0, 20);
  const fieldNames = parseResult?.matchedFields.map((item) => DAILY_LEAD_CSV_FIELD_LABELS[item.field as keyof typeof DAILY_LEAD_CSV_FIELD_LABELS] ?? item.field) ?? [];

  return (
    <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="font-medium text-slate-950">导入前确认</div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ConfirmLine label="识别到的字段映射" value={fieldNames.length ? fieldNames.join("、") : "-"} />
        <ConfirmLine label="预计新增日期数量" value={formatNumber(estimatedCreates)} />
        <ConfirmLine label="预计更新已有日期数量" value={formatNumber(estimatedUpdates)} />
      </div>
      {differences.length ? <DifferenceTable title="导入前模拟增量差异预览" differences={differences} /> : null}
      {errorRows.length ? <ErrorRows rows={errorRows} /> : null}
    </div>
  );
}

function ConfirmLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}

function ErrorRows({ rows }: { rows: ParsedDailyLeadImportRow[] }) {
  return (
    <div className="mt-4">
      <div className="text-xs font-medium text-rose-700">错误行明细前 20 条</div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2 pr-4 font-medium">行号</th>
              <th className="py-2 pr-4 font-medium">日期</th>
              <th className="py-2 pr-4 font-medium">错误</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowNumber} className="border-t border-slate-200">
                <td className="py-2 pr-4">{row.rowNumber}</td>
                <td className="py-2 pr-4">{row.stat_date || "-"}</td>
                <td className="py-2 pr-4 text-rose-700">{row.errors.join("；")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function DifferenceTable({ title, differences }: { title: string; differences: NonNullable<DailyLeadImportState["summary"]>["differences"] }) {
  return (
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold text-amber-950">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs text-amber-900">
            <tr>
              <th className="py-2 pr-4 font-medium">日期</th>
              <th className="py-2 pr-4 font-medium">字段</th>
              <th className="py-2 pr-4 font-medium">CSV值</th>
              <th className="py-2 pr-4 font-medium">系统计算值</th>
            </tr>
          </thead>
          <tbody>
            {differences.map((item) => (
              <tr key={`${item.stat_date}-${item.field}`} className="border-t border-amber-200">
                <td className="py-2 pr-4">{item.stat_date}</td>
                <td className="py-2 pr-4">{item.field}</td>
                <td className="py-2 pr-4">{item.csvValue}</td>
                <td className="py-2 pr-4">{item.systemValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewTable({ rows }: { rows: ParsedDailyLeadImportRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">行号</th>
            <th className="px-4 py-3 font-medium">日期</th>
            <th className="px-4 py-3 font-medium">Facebook</th>
            <th className="px-4 py-3 font-medium">WhatsApp1</th>
            <th className="px-4 py-3 font-medium">WhatsApp2</th>
            <th className="px-4 py-3 font-medium">女包群</th>
            <th className="px-4 py-3 font-medium">总增加数</th>
            <th className="px-4 py-3 font-medium">女包群增加</th>
            <th className="px-4 py-3 font-medium">双肩包群增加</th>
            <th className="px-4 py-3 font-medium">双肩包群</th>
            <th className="px-4 py-3 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row) => (
            <tr key={row.rowNumber} className="border-b border-slate-100">
              <td className="px-4 py-3">{row.rowNumber}</td>
              <td className="px-4 py-3">{row.stat_date || "-"}</td>
              <td className="px-4 py-3">{formatNumber(row.facebook_leads)}</td>
              <td className="px-4 py-3">{formatNumber(row.whatsapp1)}</td>
              <td className="px-4 py-3">{formatNumber(row.whatsapp2)}</td>
              <td className="px-4 py-3">{formatNumber(row.handbag_group)}</td>
              <td className="px-4 py-3">{formatOptionalNumber(row.csv_total_increase)}</td>
              <td className="px-4 py-3">{formatOptionalNumber(row.csv_handbag_group_increase)}</td>
              <td className="px-4 py-3">{formatOptionalNumber(row.csv_backpack_group_increase)}</td>
              <td className="px-4 py-3">{formatNumber(row.backpack_group)}</td>
              <td className={row.errors.length ? "px-4 py-3 text-rose-700" : "px-4 py-3 text-emerald-700"}>
                {row.errors.length ? row.errors.join("；") : "可导入"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatOptionalNumber(value: number | null) {
  return value === null ? "-" : formatNumber(value);
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
