"use client";

import { useActionState } from "react";
import { cleanupTestDataAction, type DataCleanupState } from "@/app/data-cleanup/actions";
import { formatNumber, formatRmb } from "@/lib/format";
import type { DataCleanupPreview } from "@/lib/data";

export function CleanupClient({ preview }: { preview: DataCleanupPreview }) {
  const [state, formAction, pending] = useActionState<DataCleanupState | null, FormData>(cleanupTestDataAction, null);
  const hasCleanupTargets = preview.testOrders.length > 0 || preview.testDailyLeads.length > 0;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="将清理的测试订单" value={formatNumber(preview.testOrders.length)} />
        <SummaryCard label="将清理的每日潜客" value={formatNumber(preview.testDailyLeads.length)} />
        <SummaryCard label="受影响客户数量" value={formatNumber(preview.affectedCustomerCount)} />
      </section>

      <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        清理规则只匹配明确测试数据：订单编号以 TEST- 或 IMPORT- 开头、客户名包含 Test、备注包含“测试”；每日潜客只匹配 2026-06-25 到 2026-06-28 的测试日期记录。请先核对下面明细。
      </section>

      <form action={formAction} className="rounded-md border border-slate-200 bg-white p-5">
        <label className="block text-sm font-medium text-slate-700">
          确认文字
          <input
            name="confirmation"
            placeholder="我确认只清理测试数据"
            className="mt-2 h-10 w-full max-w-md rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
          />
        </label>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">清理后会刷新客户统计，并重算每日潜客增量。</p>
          <button
            type="submit"
            disabled={!hasCleanupTargets || pending}
            className="h-10 rounded-md bg-rose-700 px-4 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {pending ? "清理中..." : "清理测试数据"}
          </button>
        </div>
      </form>

      {state ? (
        <div className={`rounded-md border px-4 py-3 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {state.message}
          {state.summary ? (
            <span>
              {" "}
              删除订单 {formatNumber(state.summary.deletedOrders)} 条，删除每日潜客 {formatNumber(state.summary.deletedDailyLeads)} 条，刷新客户{" "}
              {formatNumber(state.summary.refreshedCustomers)} 位。
            </span>
          ) : null}
        </div>
      ) : null}

      <OrdersPreviewTable rows={preview.testOrders} />
      <DailyLeadsPreviewTable rows={preview.testDailyLeads} />
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

function OrdersPreviewTable({ rows }: { rows: DataCleanupPreview["testOrders"] }) {
  return (
    <section className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3 font-semibold">将清理的测试订单明细</div>
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">日期</th>
            <th className="px-4 py-3 font-medium">订单编号</th>
            <th className="px-4 py-3 font-medium">客户</th>
            <th className="px-4 py-3 font-medium">联系方式</th>
            <th className="px-4 py-3 font-medium">国家/渠道</th>
            <th className="px-4 py-3 font-medium">销售额</th>
            <th className="px-4 py-3 font-medium">备注</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="px-4 py-3">{row.order_date || "-"}</td>
              <td className="px-4 py-3">{row.order_no}</td>
              <td className="px-4 py-3">{row.customer_name || "-"}</td>
              <td className="px-4 py-3">{row.contact || "-"}</td>
              <td className="px-4 py-3">{row.country || "-"}</td>
              <td className="px-4 py-3">{formatRmb(row.sales_amount_rmb)}</td>
              <td className="px-4 py-3">{row.remark || "-"}</td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td className="px-4 py-6 text-slate-500" colSpan={7}>
                没有匹配到测试订单。
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

function DailyLeadsPreviewTable({ rows }: { rows: DataCleanupPreview["testDailyLeads"] }) {
  return (
    <section className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3 font-semibold">将清理的每日潜客明细</div>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">日期</th>
            <th className="px-4 py-3 font-medium">Facebook</th>
            <th className="px-4 py-3 font-medium">WhatsApp1</th>
            <th className="px-4 py-3 font-medium">WhatsApp2</th>
            <th className="px-4 py-3 font-medium">女包群</th>
            <th className="px-4 py-3 font-medium">双肩包群</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="px-4 py-3">{row.stat_date}</td>
              <td className="px-4 py-3">{formatNumber(row.facebook_leads)}</td>
              <td className="px-4 py-3">{formatNumber(row.whatsapp1)}</td>
              <td className="px-4 py-3">{formatNumber(row.whatsapp2)}</td>
              <td className="px-4 py-3">{formatNumber(row.handbag_group)}</td>
              <td className="px-4 py-3">{formatNumber(row.backpack_group)}</td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td className="px-4 py-6 text-slate-500" colSpan={6}>
                没有匹配到测试每日潜客记录。
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
