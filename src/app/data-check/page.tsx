import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusNote } from "@/components/status-note";
import { Button, tableHeadClassName, tableRowClassName, tableShellClassName } from "@/components/ui";
import { formatNumber, formatRmb } from "@/lib/format";
import { getDataCheckData, type ImportReviewMetric } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DataCheckPage() {
  const result = await getDataCheckData();

  return (
    <AppShell>
      <PageHeader title="数据检查" description="用于快速确认订单、客户、每日潜客数据是否录入规范。" />
      <StatusNote configured={result.configured} error={result.error} />

      <div className="grid gap-5 lg:grid-cols-3">
        <CheckSection title="订单检查" items={result.data.orders} />
        <CheckSection title="客户检查" items={result.data.customers} />
        <CheckSection title="每日潜客检查" items={result.data.dailyLeads} />
      </div>

      <section className="mt-6">
        <CheckSection title="发货检查" items={result.data.shipping} />
      </section>

      <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-amber-950">测试数据清理</h2>
            <p className="mt-1 text-sm text-amber-900">真实导入前可先预览并清理明确测试数据，清理前会列出数量和明细。</p>
          </div>
          <Button href="/data-cleanup" variant="warning">进入清理页面</Button>
        </div>
      </section>

      <section className="mt-6 space-y-5">
        <h2 className="text-lg font-semibold">导入后核对摘要</h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <ReviewSection title="订单摘要" items={result.data.importReview.orderSummary} />
          <ReviewSection title="客户摘要" items={result.data.importReview.customerSummary} />
          <ReviewSection title="每日潜客摘要" items={result.data.importReview.dailyLeadSummary} />
        </div>
        <TopCustomersTable customers={result.data.importReview.topCustomers} />
        <RecentDailyLeadsTable rows={result.data.importReview.recentDailyLeads} />
      </section>
    </AppShell>
  );
}

function CheckSection({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: number; severity: "ok" | "warn" | "error"; kind?: "number" | "money" }>;
}) {
  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 text-sm">
            <span className="text-slate-600">{item.label}</span>
            <span className={colorForSeverity(item.severity)}>{item.kind === "money" ? formatRmb(item.value) : formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function colorForSeverity(severity: "ok" | "warn" | "error") {
  if (severity === "error") return "font-semibold text-rose-700";
  if (severity === "warn") return "font-semibold text-amber-700";
  return "font-semibold text-emerald-700";
}

function ReviewSection({ title, items }: { title: string; items: ImportReviewMetric[] }) {
  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 text-sm">
            <span className="text-slate-600">{item.label}</span>
            <span className="font-semibold text-slate-950">{formatReviewValue(item)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopCustomersTable({
  customers,
}: {
  customers: Array<{ name: string; contact: string; country: string; totalSalesRmb: number }>;
}) {
  return (
    <section className={tableShellClassName}>
      <div className="border-b border-slate-200 px-4 py-3 font-semibold">历史销售额前 10 客户</div>
      <table className="w-full min-w-[820px] table-fixed text-left text-sm [&_td]:whitespace-nowrap">
        <colgroup>
          <col className="w-[220px]" />
          <col className="w-[180px]" />
          <col className="w-[120px]" />
          <col className="w-[140px]" />
        </colgroup>
        <thead className={tableHeadClassName}>
          <tr>
            <th className="px-4 py-3 font-medium">客户</th>
            <th className="px-4 py-3 font-medium">联系方式</th>
            <th className="px-4 py-3 font-medium">国家/渠道</th>
            <th className="px-4 py-3 font-medium">历史销售额</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={`${customer.name}-${customer.contact}-${customer.country}`} className={tableRowClassName}>
              <td className="truncate px-4 py-3" title={customer.name}>{customer.name}</td>
              <td className="truncate px-4 py-3" title={customer.contact}>{customer.contact || "-"}</td>
              <td className="truncate px-4 py-3" title={customer.country}>{customer.country || "-"}</td>
              <td className="px-4 py-3 text-right font-medium">{formatRmb(customer.totalSalesRmb)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RecentDailyLeadsTable({
  rows,
}: {
  rows: Array<{
    statDate: string;
    facebookLeads: number;
    whatsapp1: number;
    whatsapp2: number;
    totalIncrease: number;
    handbagGroup: number;
    handbagGroupIncrease: number;
    backpackGroup: number;
    backpackGroupIncrease: number;
  }>;
}) {
  return (
    <section className={tableShellClassName}>
      <div className="border-b border-slate-200 px-4 py-3 font-semibold">最近 7 条每日潜客记录</div>
      <table className="w-full min-w-[1040px] table-fixed text-left text-sm [&_td]:whitespace-nowrap">
        <thead className={tableHeadClassName}>
          <tr>
            <th className="px-4 py-3 font-medium">日期</th>
            <th className="px-4 py-3 font-medium">Facebook</th>
            <th className="px-4 py-3 font-medium">WhatsApp1</th>
            <th className="px-4 py-3 font-medium">WhatsApp2</th>
            <th className="px-4 py-3 font-medium">总增加数</th>
            <th className="px-4 py-3 font-medium">女包群</th>
            <th className="px-4 py-3 font-medium">女包群增加</th>
            <th className="px-4 py-3 font-medium">双肩包群</th>
            <th className="px-4 py-3 font-medium">双肩包群增加</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.statDate} className={tableRowClassName}>
              <td className="px-4 py-3">{row.statDate}</td>
              <td className="px-4 py-3">{formatNumber(row.facebookLeads)}</td>
              <td className="px-4 py-3">{formatNumber(row.whatsapp1)}</td>
              <td className="px-4 py-3">{formatNumber(row.whatsapp2)}</td>
              <td className="px-4 py-3">{formatNumber(row.totalIncrease)}</td>
              <td className="px-4 py-3">{formatNumber(row.handbagGroup)}</td>
              <td className="px-4 py-3">{formatNumber(row.handbagGroupIncrease)}</td>
              <td className="px-4 py-3">{formatNumber(row.backpackGroup)}</td>
              <td className="px-4 py-3">{formatNumber(row.backpackGroupIncrease)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function formatReviewValue(item: ImportReviewMetric) {
  if (item.kind === "money") return formatRmb(Number(item.value));
  if (item.kind === "number") return formatNumber(Number(item.value));
  return String(item.value);
}
