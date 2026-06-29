"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber, formatRmb } from "@/lib/format";
import type { DashboardData } from "@/lib/data";

type DashboardChartsProps = {
  period: DashboardData["period"];
  monthlySales: DashboardData["monthlySales"];
  countrySales: DashboardData["countrySales"];
  recentLeads: DashboardData["recentLeads"];
};

const colors = ["#0f274a", "#2563eb", "#059669", "#d97706", "#7c3aed", "#64748b"];

export function DashboardCharts({ period, monthlySales, countrySales, recentLeads }: DashboardChartsProps) {
  const topCountries = countrySales.slice(0, 10);
  const countryShare = buildCountryShare(countrySales);
  const dateLabel = period.grain === "day" ? "日期" : "月份";
  const salesDescription = period.grain === "day" ? "按日期汇总有效销售额" : "按月份汇总有效销售额";
  const quantityDescription = period.grain === "day" ? "按日期汇总订单数量" : "按月份汇总订单数量";

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard title={period.salesChartTitle} description={salesDescription}>
          {monthlySales.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlySales} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} minTickGap={18} />
                <YAxis tickFormatter={(value) => compactMoney(Number(value))} tick={{ fontSize: 12 }} width={68} />
                <Tooltip formatter={(value) => formatRmb(Number(value))} labelFormatter={(label) => `${dateLabel}：${label}`} />
                <Line type="monotone" dataKey="sales" name="销售额" stroke="#0f274a" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="暂无订单数据，请先新增订单或导入历史订单" />
          )}
        </ChartCard>

        <ChartCard title={period.quantityChartTitle} description={quantityDescription}>
          {monthlySales.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlySales} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} minTickGap={18} />
                <YAxis tickFormatter={(value) => formatNumber(Number(value))} tick={{ fontSize: 12 }} width={58} />
                <Tooltip formatter={(value) => `${formatNumber(Number(value))} 件`} labelFormatter={(label) => `${dateLabel}：${label}`} />
                <Bar dataKey="quantity" name="数量" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="暂无数量趋势数据" />
          )}
        </ChartCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <ChartCard title="国家销售额排行" description="默认显示销售额前 10 个国家/渠道">
          {topCountries.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topCountries} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => compactMoney(Number(value))} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="country" tick={{ fontSize: 12 }} width={92} />
                <Tooltip formatter={(value) => formatRmb(Number(value))} />
                <Bar dataKey="sales" name="销售额" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="暂无国家销售数据" />
          )}
        </ChartCard>

        <ChartCard title="国家销售额占比" description="超过 6 个国家时，前 5 外合并为其他">
          {countryShare.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={countryShare} dataKey="sales" nameKey="country" innerRadius={72} outerRadius={112} paddingAngle={2}>
                  {countryShare.map((entry, index) => (
                    <Cell key={entry.country} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatRmb(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="暂无占比数据" />
          )}
          {countryShare.length ? (
            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              {countryShare.map((item, index) => (
                <div key={item.country} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                  <span className="truncate">{item.country}</span>
                  <span className="ml-auto font-medium text-slate-950">{item.percent.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          ) : null}
        </ChartCard>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">每日潜客增长趋势</h2>
            <p className="mt-1 text-sm text-slate-500">
              WhatsApp 群人数接近上限后会手动新建群，因此 Dashboard 重点观察每日增加数趋势，而不是群当前总人数。
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-5 xl:grid-cols-3">
          <LeadLineChart title="每日潜客新增" data={recentLeads} dataKey="total_increase" stroke="#0f172a" />
          <LeadLineChart title="女包群每日增加" data={recentLeads} dataKey="handbag_group_increase" stroke="#2563eb" />
          <LeadLineChart title="双肩包群每日增加" data={recentLeads} dataKey="backpack_group_increase" stroke="#059669" />
        </div>
      </section>
    </div>
  );
}

function LeadLineChart({
  title,
  data,
  dataKey,
  stroke,
}: {
  title: string;
  data: DashboardData["recentLeads"];
  dataKey: "total_increase" | "handbag_group_increase" | "backpack_group_increase";
  stroke: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-inner shadow-white">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="mt-3 h-56">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="stat_date" tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis tickFormatter={(value) => formatNumber(Number(value))} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatSigned(Number(value))} labelFormatter={(label) => `日期：${label}`} />
              <Line type="monotone" dataKey={dataKey} name={title} stroke={stroke} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="暂无每日潜客数据，请先新增或导入每日潜客统计" compact />
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="polish-fade-in rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/70 transition duration-200 hover:shadow-md hover:shadow-slate-200/70">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyChart({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 text-center text-sm text-slate-500 ${compact ? "h-full" : "h-[280px]"}`}>
      {message}
    </div>
  );
}

function buildCountryShare(countrySales: DashboardData["countrySales"]) {
  const total = countrySales.reduce((sum, item) => sum + item.sales, 0);
  const rows = countrySales.length > 6
    ? [
        ...countrySales.slice(0, 5),
        {
          country: "其他",
          sales: countrySales.slice(5).reduce((sum, item) => sum + item.sales, 0),
          quantity: countrySales.slice(5).reduce((sum, item) => sum + item.quantity, 0),
        },
      ]
    : countrySales;

  return rows.map((item) => ({
    ...item,
    percent: total > 0 ? (item.sales / total) * 100 : 0,
  }));
}

function compactMoney(value: number) {
  if (Math.abs(value) >= 10000) return `${formatNumber(Math.round(value / 10000))}万`;
  return formatNumber(value);
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}
