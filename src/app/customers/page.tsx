import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CsvExportButton } from "@/components/csv-export-button";
import { PageHeader } from "@/components/page-header";
import { StatusNote } from "@/components/status-note";
import { Badge, Button, tableHeadClassName, tableRowClassName, tableShellClassName } from "@/components/ui";
import { refreshCustomerStatsAction } from "@/app/customers/actions";
import { formatDate, formatNumber, formatRmb } from "@/lib/format";
import { getCustomerFilterOptions, getCustomers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ refreshed?: string; followPriority?: string; valueLevel?: string; country?: string; search?: string }>;
}) {
  const { refreshed, ...filters } = await searchParams;
  const [result, filterOptions, exportResult] = await Promise.all([getCustomers(filters), getCustomerFilterOptions(), getCustomers({}, 10000)]);
  const exportRows = exportResult.data.map((customer) => ({
    客户名: customer.name,
    联系方式: customer.contact ?? "",
    "国家/渠道": customer.country ?? "",
    首单日期: customer.first_order_date ?? "",
    最近下单日期: customer.last_order_date ?? "",
    历史订单数: customer.total_orders,
    历史购买数量: customer.total_quantity,
    历史销售额RMB: customer.total_sales_rmb,
    复购状态: customer.repurchase_status,
    客户价值等级: customer.customer_value_level,
    复购潜力: customer.repurchase_potential,
    跟进优先级: customer.follow_priority,
    建议跟进动作: customer.follow_suggestion ?? "",
    最后跟进日期: customer.last_follow_date ?? "",
    最后跟进结果: customer.last_follow_result ?? "",
    下次联系日期: customer.next_follow_date ?? "",
    备注: customer.remark ?? "",
  }));

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="客户管理" description="客户统计由订单汇总生成；新增订单后会自动刷新，也可以在这里手动重算。" />
        <div className="flex flex-wrap gap-2">
          <CsvExportButton filenamePrefix="customers" rows={exportRows} label="导出客户 CSV" />
          <form action={refreshCustomerStatsAction}>
            <Button type="submit">刷新客户统计</Button>
          </form>
        </div>
      </div>
      <StatusNote configured={result.configured} error={result.error ?? filterOptions.error} />
      {refreshed ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          客户统计已根据订单重新汇总。
        </div>
      ) : null}

      <form className="mb-5 grid gap-3 rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto]" action="/customers">
        <label className="text-sm font-medium text-slate-700">
          搜索
          <input
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="客户名 / 联系方式"
            className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
          />
        </label>
        <FilterSelect label="跟进优先级" name="followPriority" value={filters.followPriority} options={filterOptions.data.followPriorities} />
        <FilterSelect label="客户价值等级" name="valueLevel" value={filters.valueLevel} options={filterOptions.data.valueLevels} />
        <FilterSelect label="国家/渠道" name="country" value={filters.country} options={filterOptions.data.countries} />
        <Button type="submit" className="self-end">筛选</Button>
        <Button href="/customers" variant="secondary" className="self-end">清空</Button>
      </form>

      <div className={tableShellClassName}>
        <table className="w-full min-w-[1380px] text-left text-sm">
          <thead className={tableHeadClassName}>
            <tr>
              <th className="px-4 py-3 font-medium">客户名</th>
              <th className="px-4 py-3 font-medium">联系方式</th>
              <th className="px-4 py-3 font-medium">国家/渠道</th>
              <th className="px-4 py-3 font-medium">首单日期</th>
              <th className="px-4 py-3 font-medium">最近下单日期</th>
              <th className="px-4 py-3 text-right font-medium">历史订单数</th>
              <th className="px-4 py-3 text-right font-medium">历史购买总数量</th>
              <th className="px-4 py-3 text-right font-medium">历史销售额RMB</th>
              <th className="px-4 py-3 font-medium">复购状态</th>
              <th className="px-4 py-3 font-medium">客户价值等级</th>
              <th className="px-4 py-3 font-medium">客户复购潜力</th>
              <th className="px-4 py-3 font-medium">跟进优先级</th>
              <th className="px-4 py-3 font-medium">建议跟进动作</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {result.data.length ? (
              result.data.map((customer) => (
                <tr key={customer.id} className={tableRowClassName}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/customers/${customer.id}`} className="underline underline-offset-4">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{customer.contact ?? "-"}</td>
                  <td className="px-4 py-3">{customer.country ?? "-"}</td>
                  <td className="px-4 py-3">{formatDate(customer.first_order_date)}</td>
                  <td className="px-4 py-3">{formatDate(customer.last_order_date)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(customer.total_orders)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(customer.total_quantity)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatRmb(Number(customer.total_sales_rmb ?? 0))}</td>
                  <td className="px-4 py-3">{customer.repurchase_status}</td>
                  <td className="px-4 py-3">{customer.customer_value_level}</td>
                  <td className="px-4 py-3">{customer.repurchase_potential}</td>
                  <td className="px-4 py-3"><PriorityBadge value={customer.follow_priority} /></td>
                  <td className="px-4 py-3 text-slate-600">{customer.follow_suggestion ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Button href={`/customers/${customer.id}`} variant="secondary" className="h-8 px-3">详情</Button>
                      <Button href={`/customers/${customer.id}/edit`} variant="secondary" className="h-8 px-3">跟进/编辑</Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={14}>暂无客户数据，请先新增或导入订单并刷新客户统计</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value?: string;
  options: string[];
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
      >
        <option value="">全部</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function PriorityBadge({ value }: { value: string }) {
  if (value === "优先跟进") return <Badge tone="danger">{value}</Badge>;
  if (value === "可跟进") return <Badge tone="warning">{value}</Badge>;
  return <Badge>{value}</Badge>;
}
