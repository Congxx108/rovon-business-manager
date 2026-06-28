import { AppShell } from "@/components/app-shell";
import { CsvExportButton } from "@/components/csv-export-button";
import { FormField } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { StatusNote } from "@/components/status-note";
import { Button, Badge, tableHeadClassName, tableRowClassName, tableShellClassName } from "@/components/ui";
import { quickCreateDailyLead, quickUpdateExistingDailyLead } from "@/app/daily-leads/actions";
import { todayString } from "@/lib/csv";
import { formatNumber } from "@/lib/format";
import { getDailyLeads } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DailyLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    updated?: string;
    exists?: string;
    stat_date?: string;
    facebook_leads?: string;
    whatsapp1?: string;
    whatsapp2?: string;
    handbag_group?: string;
    backpack_group?: string;
  }>;
}) {
  const params = await searchParams;
  const result = await getDailyLeads(10000);
  const exportRows = result.data.map((lead) => ({
    日期: lead.stat_date,
    Facebook后台潜在客户: lead.facebook_leads,
    WhatsApp1: lead.whatsapp1,
    WhatsApp2: lead.whatsapp2,
    总增加数: lead.total_increase,
    女包群: lead.handbag_group,
    "增加数-女包群": lead.handbag_group_increase,
    双肩包群: lead.backpack_group,
    "增加数-双肩包群": lead.backpack_group_increase,
    是否女包群换群: lead.is_handbag_group_reset ? "是" : "否",
    是否双肩包群换群: lead.is_backpack_group_reset ? "是" : "否",
    手动总增加数: lead.total_increase_override ?? "",
    手动女包群增加数: lead.handbag_group_increase_override ?? "",
    手动双肩包群增加数: lead.backpack_group_increase_override ?? "",
    修正备注: lead.increase_note ?? "",
  }));

  return (
    <AppShell>
      <PageHeader
        title="每日潜客统计"
        description="每天只填写累计数，系统会自动计算每日增加数；换群、历史修正等特殊情况可以在编辑页手动修正增加数。"
        actionHref="/daily-leads/import"
        actionLabel="导入每日统计"
      />
      <StatusNote configured={result.configured} error={result.error} />
      <div className="mb-4 flex justify-end">
        <CsvExportButton filenamePrefix="daily-leads" rows={exportRows} label="导出每日潜客 CSV" />
      </div>

      {params.error ? <Message tone="error" text={params.error} /> : null}
      {params.saved ? <Message tone="success" text="今日潜客数据已保存，系统已重新计算增加数。" /> : null}
      {params.updated ? <Message tone="success" text="更新成功，该日期数据已刷新。" /> : null}
      {params.exists ? <ExistingDateNotice params={params} /> : null}

      <details className="mb-5 rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50" open>
        <summary className="cursor-pointer text-base font-semibold text-slate-950">展开/收起快速录入今日统计</summary>
        <p className="mt-2 text-sm text-slate-500">
          正常情况下只填累计数；总增加数、女包群增加数、双肩包群增加数会由系统自动计算。
        </p>
        <form action={quickCreateDailyLead} className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="日期" name="stat_date" type="date" required defaultValue={params.stat_date ?? todayString()} />
            <FormField label="Facebook后台潜在客户" name="facebook_leads" type="number" required min={0} defaultValue={params.facebook_leads ?? 0} />
            <FormField label="WhatsApp1" name="whatsapp1" type="number" required min={0} defaultValue={params.whatsapp1 ?? 0} />
            <FormField label="WhatsApp2" name="whatsapp2" type="number" required min={0} defaultValue={params.whatsapp2 ?? 0} />
            <FormField label="女包群" name="handbag_group" type="number" required min={0} defaultValue={params.handbag_group ?? 0} />
            <FormField label="双肩包群" name="backpack_group" type="number" required min={0} defaultValue={params.backpack_group ?? 0} />
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="submit">保存今日统计</Button>
          </div>
        </form>
      </details>

      <div className={tableShellClassName}>
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className={tableHeadClassName}>
            <tr>
              <th className="px-4 py-3 font-medium">日期</th>
              <th className="px-4 py-3 text-right font-medium">Facebook后台潜在客户</th>
              <th className="px-4 py-3 text-right font-medium">WhatsApp1</th>
              <th className="px-4 py-3 text-right font-medium">WhatsApp2</th>
              <th className="px-4 py-3 text-right font-medium">总增加数</th>
              <th className="px-4 py-3 text-right font-medium">女包群</th>
              <th className="px-4 py-3 text-right font-medium">增加数-女包群</th>
              <th className="px-4 py-3 text-right font-medium">双肩包群</th>
              <th className="px-4 py-3 text-right font-medium">增加数-双肩包群</th>
              <th className="px-4 py-3 font-medium">标记</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {result.data.length ? (
              result.data.map((lead) => (
                <tr key={lead.id} className={tableRowClassName}>
                  <td className="px-4 py-3 font-medium">{lead.stat_date}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(lead.facebook_leads)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(lead.whatsapp1)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(lead.whatsapp2)}</td>
                  <td className="px-4 py-3 text-right"><IncreaseBadge value={lead.total_increase} manual={lead.total_increase_override !== null} /></td>
                  <td className="px-4 py-3 text-right">{formatNumber(lead.handbag_group)}</td>
                  <td className="px-4 py-3 text-right"><IncreaseBadge value={lead.handbag_group_increase} manual={lead.handbag_group_increase_override !== null} /></td>
                  <td className="px-4 py-3 text-right">{formatNumber(lead.backpack_group)}</td>
                  <td className="px-4 py-3 text-right"><IncreaseBadge value={lead.backpack_group_increase} manual={lead.backpack_group_increase_override !== null} /></td>
                  <td className="px-4 py-3"><LeadMarkers lead={lead} /></td>
                  <td className="px-4 py-3">
                    <Button href={`/daily-leads/${lead.id}/edit`} variant="secondary" className="h-8 px-3">编辑</Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={11}>暂无每日潜客数据，请先新增或导入每日潜客统计</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}

function IncreaseBadge({ value, manual }: { value: number; manual?: boolean }) {
  return <Badge tone={manual ? "info" : value > 0 ? "success" : value < 0 ? "warning" : "neutral"}>{formatSigned(value)}</Badge>;
}

function LeadMarkers({ lead }: { lead: Awaited<ReturnType<typeof getDailyLeads>>["data"][number] }) {
  const hasManual =
    lead.total_increase_override !== null ||
    lead.handbag_group_increase_override !== null ||
    lead.backpack_group_increase_override !== null;
  const markers = [
    hasManual ? "手动修正" : null,
    lead.is_handbag_group_reset ? "女包换群" : null,
    lead.is_backpack_group_reset ? "双肩包换群" : null,
  ].filter(Boolean);

  if (!markers.length) return <span className="text-slate-400">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {markers.map((marker) => (
        <Badge key={marker} tone={marker === "手动修正" ? "info" : "warning"}>{marker}</Badge>
      ))}
    </div>
  );
}

function ExistingDateNotice({
  params,
}: {
  params: {
    stat_date?: string;
    facebook_leads?: string;
    whatsapp1?: string;
    whatsapp2?: string;
    handbag_group?: string;
    backpack_group?: string;
  };
}) {
  return (
    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
      <div className="font-medium">该日期已存在，确认后将更新这一天的数据，不会新增重复记录。</div>
      <form action={quickUpdateExistingDailyLead} className="mt-3 flex flex-wrap gap-3">
        {["stat_date", "facebook_leads", "whatsapp1", "whatsapp2", "handbag_group", "backpack_group"].map((name) => (
          <input key={name} type="hidden" name={name} value={params[name as keyof typeof params] ?? ""} />
        ))}
        <Button type="submit" variant="warning">更新这一天的数据</Button>
        <Button href="/daily-leads" variant="secondary">取消</Button>
      </form>
    </div>
  );
}

function Message({ tone, text }: { tone: "success" | "error"; text: string }) {
  const className =
    tone === "success"
      ? "mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
      : "mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800";
  return <div className={className}>{text}</div>;
}
