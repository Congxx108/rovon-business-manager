"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { getOrderImportPreviewAction, importOrdersAction, type OrderImportPreviewState, type OrderImportState } from "@/app/orders/import/actions";
import {
  ORDER_CSV_FIELD_ALIASES,
  ORDER_CSV_FIELD_LABELS,
  parseCsvFile,
  type CsvParseResult,
  type CsvRecord,
} from "@/lib/csv";
import { mapOrderImportRows, orderImportSummary, type ParsedOrderImportRow } from "@/lib/imports";
import { formatNumber, formatRmb } from "@/lib/format";
import { inputClassName, labelClassName, tableHeadClassName, tableRowClassName, tableShellClassName } from "@/components/ui";

export function OrderImportClient() {
  const [records, setRecords] = useState<CsvRecord[]>([]);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [importPreview, setImportPreview] = useState<OrderImportPreviewState>({ existingOrderNos: [] });
  const [fileError, setFileError] = useState("");
  const [defaultCountry, setDefaultCountry] = useState("");
  const [defaultProductLine, setDefaultProductLine] = useState("女包");
  const [state, formAction, pending] = useActionState<OrderImportState | null, FormData>(importOrdersAction, null);

  const rows = useMemo(
    () => mapOrderImportRows(records, { country: defaultCountry, productLine: defaultProductLine }),
    [records, defaultCountry, defaultProductLine],
  );
  const summary = orderImportSummary(rows);
  const validRows = rows.filter((row) => row.errors.length === 0);
  const existingOrderNos = new Set(importPreview.existingOrderNos);
  const uniqueValidOrderNos = Array.from(new Set(validRows.map((row) => row.order_no)));
  const validOrderNoKey = uniqueValidOrderNos.join("\n");
  const estimatedUpdates = uniqueValidOrderNos.filter((orderNo) => existingOrderNos.has(orderNo)).length;
  const estimatedCreates = uniqueValidOrderNos.length - estimatedUpdates;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileError("");
    setRecords([]);
    setParseResult(null);
    setImportPreview({ existingOrderNos: [] });

    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("第三阶段先支持 CSV，请把 Excel 另存为 CSV 后再导入。");
      return;
    }

    try {
      const result = await parseCsvFile(file, ORDER_CSV_FIELD_ALIASES);
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
    const orderNos = validOrderNoKey ? validOrderNoKey.split("\n").filter(Boolean) : [];

    if (!orderNos.length) {
      return;
    }

    getOrderImportPreviewAction(orderNos).then((result) => {
      if (!cancelled) setImportPreview(result);
    });

    return () => {
      cancelled = true;
    };
  }, [validOrderNoKey]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/70">
        <div className="grid gap-4 md:grid-cols-3">
          <label className={labelClassName}>
            CSV 文件
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="mt-2 block w-full text-sm text-slate-700" />
            <DownloadOrderTemplateButton />
          </label>
          <label className={labelClassName}>
            默认国家/渠道
            <input
              value={defaultCountry}
              onChange={(event) => setDefaultCountry(event.target.value)}
              placeholder="CSV 没有国家列时使用"
              className={inputClassName}
            />
          </label>
          <label className={labelClassName}>
            默认产品线
            <input
              value={defaultProductLine}
              onChange={(event) => setDefaultProductLine(event.target.value)}
              className={inputClassName}
            />
          </label>
        </div>
        {fileError ? <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{fileError}</div> : null}
      </div>

      {records.length ? (
        <>
          {parseResult ? <CsvParseInfo result={parseResult} rows={rows} /> : null}

          <ImportSummaryCards
            items={[
              ["总行数", formatNumber(summary.totalRows)],
              ["可导入行数", formatNumber(summary.validRows)],
              ["缺少/错误行数", formatNumber(summary.errorRows)],
              ["销售额合计", formatRmb(summary.salesTotal)],
              ["数量合计", formatNumber(summary.quantityTotal)],
            ]}
          />

          <form action={formAction} className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/70">
            <textarea name="rows" value={JSON.stringify(rows)} readOnly hidden />
            <ImportConfirmDetails
              parseResult={parseResult}
              defaultCountry={defaultCountry}
              defaultProductLine={defaultProductLine}
              rows={rows}
              estimatedCreates={estimatedCreates}
              estimatedUpdates={estimatedUpdates}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">确认后将导入可通过校验的订单行；同订单编号再次导入会更新该订单。</p>
              <button
                type="submit"
                disabled={!validRows.length || pending}
                className="h-10 rounded-lg bg-[#0f274a] px-4 text-sm font-semibold text-white transition hover:bg-[#16365f] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {pending ? "导入中..." : "确认导入订单"}
              </button>
            </div>
          </form>

          {state ? (
            <div className={`rounded-md border px-4 py-3 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {state.message}
              {state.summary ? <span> 已处理 {formatNumber(state.summary.importedRows)} 行。</span> : null}
            </div>
          ) : null}

          <PreviewTable rows={rows} />
        </>
      ) : null}
    </div>
  );
}

function DownloadOrderTemplateButton() {
  return (
    <button
      type="button"
      onClick={() =>
        downloadCsv(
          "rovon-order-import-template.csv",
          "时间,Whatsapp号码,姓名,销售额,个数,备注,合同号,国家/渠道,产品线,发货状态,物流方式,物流/快运公司,物流单号,发货日期,发货备注\r\n2026-06-15,234111111111,Ada Test,6000,120,示例订单,EXAMPLE-001,尼日利亚,女包,未发货,,,,,\r\n",
        )
      }
      className="mt-3 inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      下载订单导入模板
    </button>
  );
}

function CsvParseInfo({ result, rows }: { result: CsvParseResult; rows: ParsedOrderImportRow[] }) {
  const hasScientificContact = rows.some((row) => row.contactWarning);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 text-sm shadow-sm shadow-slate-200/70">
      <div className="font-medium text-slate-950">CSV 识别结果</div>
      <div className="mt-3 text-slate-700">当前识别到的编码：{result.encoding}</div>
      <div className="mt-3">
        <div className="text-xs text-slate-500">成功识别到的字段映射</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {result.matchedFields.map((item) => (
            <span key={item.field} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {ORDER_CSV_FIELD_LABELS[item.field as keyof typeof ORDER_CSV_FIELD_LABELS] ?? item.field} = {item.header}
            </span>
          ))}
        </div>
      </div>
      {hasScientificContact ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          检测到科学计数法号码，已尽量转换为普通数字字符串。号码可能已被 Excel 改写，建议原 Excel 中将 WhatsApp 列设置为文本后重新导出；如果 Excel 已经丢失精度，程序不能恢复原始号码。
        </div>
      ) : null}
    </div>
  );
}

function ImportConfirmDetails({
  parseResult,
  defaultCountry,
  defaultProductLine,
  rows,
  estimatedCreates,
  estimatedUpdates,
}: {
  parseResult: CsvParseResult | null;
  defaultCountry: string;
  defaultProductLine: string;
  rows: ParsedOrderImportRow[];
  estimatedCreates: number;
  estimatedUpdates: number;
}) {
  const errorRows = rows.filter((row) => row.errors.length > 0).slice(0, 20);
  const hasScientificContact = rows.some((row) => row.contactWarning);
  const fieldNames = parseResult?.matchedFields.map((item) => ORDER_CSV_FIELD_LABELS[item.field as keyof typeof ORDER_CSV_FIELD_LABELS] ?? item.field) ?? [];
  const usesDefaultCountry = Boolean(defaultCountry.trim()) && rows.some((row) => row.errors.length === 0 && row.country === defaultCountry.trim());
  const usesDefaultProductLine = Boolean(defaultProductLine.trim()) && rows.some((row) => row.errors.length === 0 && row.product_line === defaultProductLine.trim());

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
      <div className="font-medium text-slate-950">导入前确认</div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ConfirmLine label="识别到的字段映射" value={fieldNames.length ? fieldNames.join("、") : "-"} />
        <ConfirmLine label="默认国家/渠道是否会被使用" value={usesDefaultCountry ? `会使用：${defaultCountry.trim()}` : "不会使用"} />
        <ConfirmLine label="默认产品线是否会被使用" value={usesDefaultProductLine ? `会使用：${defaultProductLine.trim()}` : "不会使用"} />
        <ConfirmLine label="预计新增订单数量" value={formatNumber(estimatedCreates)} />
        <ConfirmLine label="预计更新已有订单数量" value={formatNumber(estimatedUpdates)} />
      </div>
      {hasScientificContact ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          检测到科学计数法 WhatsApp 号码，请确认原始号码没有被 Excel 改写。
        </div>
      ) : null}
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

function ErrorRows({ rows }: { rows: ParsedOrderImportRow[] }) {
  return (
    <div className="mt-4">
      <div className="text-xs font-medium text-rose-700">错误行明细前 20 条</div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2 pr-4 font-medium">行号</th>
              <th className="py-2 pr-4 font-medium">订单编号</th>
              <th className="py-2 pr-4 font-medium">错误</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowNumber} className="border-t border-slate-200">
                <td className="py-2 pr-4">{row.rowNumber}</td>
                <td className="py-2 pr-4">{row.order_no}</td>
                <td className="py-2 pr-4 text-rose-700">{row.errors.join("；")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportSummaryCards({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm shadow-slate-200/60">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-2 text-lg font-semibold">{value}</div>
        </div>
      ))}
    </div>
  );
}

function PreviewTable({ rows }: { rows: ParsedOrderImportRow[] }) {
  return (
    <div className={tableShellClassName}>
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead className={tableHeadClassName}>
          <tr>
            <th className="px-4 py-3 font-medium">行号</th>
            <th className="px-4 py-3 font-medium">日期</th>
            <th className="px-4 py-3 font-medium">订单编号</th>
            <th className="px-4 py-3 font-medium">客户</th>
            <th className="px-4 py-3 font-medium">联系方式</th>
            <th className="px-4 py-3 font-medium">国家/渠道</th>
            <th className="px-4 py-3 font-medium">产品线</th>
            <th className="px-4 py-3 font-medium">数量</th>
            <th className="px-4 py-3 font-medium">销售额</th>
            <th className="px-4 py-3 font-medium">发货状态</th>
            <th className="px-4 py-3 font-medium">物流单号</th>
            <th className="px-4 py-3 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row) => (
            <tr key={row.rowNumber} className={tableRowClassName}>
              <td className="px-4 py-3">{row.rowNumber}</td>
              <td className="px-4 py-3">{row.order_date || "-"}</td>
              <td className="px-4 py-3">{row.order_no}</td>
              <td className="px-4 py-3">{row.customer_name ?? "-"}</td>
              <td className="px-4 py-3">
                {row.contact ?? "-"}
                {row.contactWarning ? <div className="mt-1 text-xs text-amber-700">{row.contactWarning}</div> : null}
              </td>
              <td className="px-4 py-3">{row.country ?? "-"}</td>
              <td className="px-4 py-3">{row.product_line ?? "-"}</td>
              <td className="px-4 py-3">{formatNumber(row.quantity)}</td>
              <td className="px-4 py-3">{formatRmb(row.sales_amount_rmb)}</td>
              <td className="px-4 py-3">{row.shipping_status}</td>
              <td className="px-4 py-3">{row.tracking_no ?? "-"}</td>
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
