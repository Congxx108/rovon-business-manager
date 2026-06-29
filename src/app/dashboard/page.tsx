import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { MarkShippedForm } from "@/components/mark-shipped-form";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusNote } from "@/components/status-note";
import { ShippingStatusBadge } from "@/components/shipping-status-badge";
import { Badge, Button, inputClassName, tableHeadClassName, tableRowClassName, tableShellClassName } from "@/components/ui";
import { DashboardCharts } from "@/app/dashboard/dashboard-charts";
import { formatDate, formatNumber, formatRmb } from "@/lib/format";
import { getDashboardData, type DashboardPeriod } from "@/lib/data";

export const dynamic = "force-dynamic";

const periods: Array<{ value: DashboardPeriod; label: string; title: string; href: string }> = [
  { value: "default_12m", label: "默认", title: "最近12个月 · 按月", href: "/dashboard" },
  { value: "this_month", label: "本月", title: "本月 · 按天", href: "/dashboard?period=this_month" },
  { value: "last_30d", label: "最近30天", title: "最近30天 · 按天", href: "/dashboard?period=last_30d" },
  { value: "last_90d", label: "最近90天", title: "最近90天 · 按天", href: "/dashboard?period=last_90d" },
  { value: "this_year", label: "今年", title: "今年 · 按月", href: "/dashboard?period=this_year" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: DashboardPeriod; startDate?: string; endDate?: string }>;
}) {
  const { period, startDate, endDate } = await searchParams;
  const activePeriod = isDashboardPeriod(period) ? period : "default_12m";
  const result = await getDashboardData({ period: activePeriod, startDate, endDate });
  const data = result.data;
  const isCustom = data.period.period === "custom";

  return (
    <AppShell>
      <PageHeader title="Dashboard 总览" description="展示有效订单、销售趋势、每日潜客增加趋势和当前需要跟进的客户。" />
      <StatusNote configured={result.configured} error={result.error} />

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm shadow-slate-200/60">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-slate-100/80 p-1">
            {periods.map((item) => (
              <Link
                key={item.value}
                href={item.href}
                title={item.title}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                  data.period.period === item.value
                    ? "bg-[#0f274a] text-white shadow-sm shadow-blue-900/20"
                    : "text-slate-600 hover:bg-white hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <span
              title="自定义日期范围"
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                isCustom
                  ? "bg-[#0f274a] text-white shadow-sm shadow-blue-900/20"
                  : "text-slate-500"
              }`}
            >
              自定义
            </span>
          </div>

          <form action="/dashboard" className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="period" value="custom" />
            <label className="text-xs font-medium text-slate-600">
              开始日期
              <input
                type="date"
                name="startDate"
                required
                defaultValue={isCustom ? data.period.startDate : startDate ?? ""}
                className={`${inputClassName} mt-1 h-9 min-w-[150px]`}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              结束日期
              <input
                type="date"
                name="endDate"
                required
                defaultValue={isCustom ? data.period.endDate : endDate ?? ""}
                className={`${inputClassName} mt-1 h-9 min-w-[150px]`}
              />
            </label>
            <Button type="submit" className="h-9 px-3">应用</Button>
            <Button href="/dashboard" variant="secondary" className="h-9 px-3">清除</Button>
          </form>
        </div>
        <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>当前范围：{data.period.detail}</span>
          {data.period.error ? <span className="font-medium text-rose-600">{data.period.error}</span> : null}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="总销售额 RMB" value={formatRmb(data.totalSalesRmb)} hint="已排除取消/退款订单" tone="info" />
        <StatCard label="总订单数" value={formatNumber(data.totalOrders)} hint="已排除取消/退款订单" />
        <StatCard label="总销售数量" value={formatNumber(data.totalQuantity)} hint="订单总数量汇总" />
        <StatCard label="平均订单金额" value={formatRmb(data.averageOrderAmountRmb)} hint="总销售额 / 总订单数" />
      </section>

      <section className="mt-6 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50 p-5 shadow-sm shadow-amber-100/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-amber-950">待发货订单</h2>
            <p className="mt-1 text-sm text-amber-900">每天优先检查这里，避免漏发货或重复发货。此模块不受顶部销售时间筛选影响，始终显示当前未完成发货订单。</p>
          </div>
          <Button href="/orders?pendingShipping=1" variant="warning">查看全部待发货</Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <StatCard label="待发货订单数量" value={formatNumber(data.pendingShipping.count)} hint="未发货 / 备货中 / 部分发货" tone="warning" />
          <StatCard label="待发货订单总销售额" value={formatRmb(data.pendingShipping.salesTotal)} hint="已排除取消/退款订单" tone="warning" />
          <StatCard label="待发货订单总数量" value={formatNumber(data.pendingShipping.quantityTotal)} hint="待发货订单数量合计" tone="warning" />
        </div>
        <div className={`mt-4 ${tableShellClassName}`}>
          <table className="w-full min-w-[1240px] table-fixed text-left text-sm [&_td]:whitespace-nowrap">
            <colgroup>
              <col className="w-[90px]" />
              <col className="w-[130px]" />
              <col className="w-[160px]" />
              <col className="w-[100px]" />
              <col className="w-[90px]" />
              <col className="w-[80px]" />
              <col className="w-[120px]" />
              <col className="w-[100px]" />
              <col className="w-[90px]" />
              <col className="w-[280px]" />
            </colgroup>
            <thead className={tableHeadClassName}>
              <tr>
                <th className="px-4 py-3 font-medium">订单日期</th>
                <th className="px-4 py-3 font-medium">订单编号</th>
                <th className="px-4 py-3 font-medium">客户名</th>
                <th className="px-4 py-3 font-medium">国家/渠道</th>
                <th className="px-4 py-3 font-medium">产品线</th>
                <th className="px-4 py-3 text-right font-medium">数量</th>
                <th className="px-4 py-3 text-right font-medium">销售额RMB</th>
                <th className="px-4 py-3 font-medium">发货状态</th>
                <th className="px-4 py-3 font-medium">编辑</th>
                <th className="px-4 py-3 font-medium">标记已发货</th>
              </tr>
            </thead>
            <tbody>
              {data.pendingShipping.orders.length ? (
                data.pendingShipping.orders.map((order) => (
                  <tr key={order.id} className={tableRowClassName}>
                    <td className="px-4 py-3">{formatDate(order.order_date)}</td>
                    <td className="truncate px-4 py-3 font-medium" title={order.order_no}>{order.order_no}</td>
                    <td className="truncate px-4 py-3" title={order.customer_name ?? ""}>{order.customer_name}</td>
                    <td className="truncate px-4 py-3" title={order.country ?? ""}>{order.country ?? "-"}</td>
                    <td className="truncate px-4 py-3" title={order.product_line ?? ""}>{order.product_line ?? "-"}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(order.quantity)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatRmb(Number(order.sales_amount_effective_rmb ?? order.sales_amount_rmb ?? 0))}</td>
                    <td className="px-4 py-3"><ShippingStatusBadge value={order.shipping_status} /></td>
                    <td className="px-4 py-3"><Button href={`/orders/${order.id}/edit`} variant="secondary" className="h-8 px-3">编辑</Button></td>
                    <td className="px-4 py-3">
                      <MarkShippedForm
                        orderId={order.id}
                        returnTo="/dashboard"
                        orderNo={order.order_no}
                        customerName={order.customer_name}
                        country={order.country}
                        quantity={order.quantity}
                        salesAmountRmb={Number(order.sales_amount_effective_rmb ?? order.sales_amount_rmb ?? 0)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={10}>当前没有待发货订单</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <DashboardCharts period={data.period} monthlySales={data.monthlySales} countrySales={data.countrySales} recentLeads={data.recentLeads} />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/70">
        <h2 className="text-lg font-semibold tracking-tight">需要跟进客户列表</h2>
        <p className="mt-1 text-sm text-slate-500">此列表不受 Dashboard 时间范围影响，始终显示当前需要跟进的客户。</p>
        <div className={`mt-4 ${tableShellClassName}`}>
          <table className="w-full min-w-[980px] table-fixed text-left text-sm [&_td]:whitespace-nowrap">
            <thead className={tableHeadClassName}>
              <tr>
                <th className="px-4 py-3 font-medium">客户名</th>
                <th className="px-4 py-3 font-medium">国家/渠道</th>
                <th className="px-4 py-3 text-right font-medium">历史销售额RMB</th>
                <th className="px-4 py-3 font-medium">最近下单日期</th>
                <th className="px-4 py-3 text-right font-medium">距最近下单天数</th>
                <th className="px-4 py-3 font-medium">跟进优先级</th>
                <th className="px-4 py-3 font-medium">建议跟进动作</th>
              </tr>
            </thead>
            <tbody>
              {data.followCustomers.length ? (
                data.followCustomers.map((customer) => (
                  <tr key={customer.id} className={tableRowClassName}>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/customers/${customer.id}`} className="underline underline-offset-4">
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{customer.country ?? "-"}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatRmb(Number(customer.total_sales_rmb ?? 0))}</td>
                    <td className="px-4 py-3">{formatDate(customer.last_order_date)}</td>
                    <td className="px-4 py-3 text-right">{customer.days_since_last_order ?? "-"}</td>
                    <td className="px-4 py-3"><PriorityBadge value={customer.follow_priority} /></td>
                    <td className="px-4 py-3 text-slate-600">{customer.follow_suggestion ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={7}>暂无需要跟进的客户</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function isDashboardPeriod(value?: string): value is DashboardPeriod {
  return value === "default_12m"
    || value === "this_month"
    || value === "last_30d"
    || value === "last_90d"
    || value === "this_year"
    || value === "custom";
}

function PriorityBadge({ value }: { value: string }) {
  if (value === "优先跟进") return <Badge tone="danger">{value}</Badge>;
  if (value === "可跟进") return <Badge tone="warning">{value}</Badge>;
  return <Badge>{value}</Badge>;
}
