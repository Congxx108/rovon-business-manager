import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FormField } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { Button, FormSection } from "@/components/ui";
import { updateDailyLead } from "@/app/daily-leads/actions";
import { getDailyLeadById } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditDailyLeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
    total_increase?: string;
    handbag_group_increase?: string;
    backpack_group_increase?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const result = await getDailyLeadById(id);
  const lead = result.data;
  if (!lead) notFound();

  const saveAction = updateDailyLead.bind(null, id);

  return (
    <AppShell>
      <PageHeader title="编辑每日潜客统计" description="正常只编辑累计字段；换群、历史修正等特殊情况可以手动覆盖增加数。" />

      {query.error ? <Message tone="error" text={query.error} /> : null}
      {query.saved ? (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <div className="font-medium">保存成功，系统已重新计算增量。</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <ResultCard label="总增加数" value={query.total_increase ?? lead.total_increase} />
            <ResultCard label="增加数-女包群" value={query.handbag_group_increase ?? lead.handbag_group_increase} />
            <ResultCard label="增加数-双肩包群" value={query.backpack_group_increase ?? lead.backpack_group_increase} />
          </div>
        </div>
      ) : null}

      <form action={saveAction} className="max-w-3xl space-y-5">
        <FormSection title="累计字段" description="修改历史记录后，系统会按日期顺序重新计算所有增量。">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="日期" name="stat_date" type="date" required defaultValue={lead.stat_date} />
            <FormField label="Facebook后台潜在客户" name="facebook_leads" type="number" required min={0} defaultValue={lead.facebook_leads} />
            <FormField label="WhatsApp1" name="whatsapp1" type="number" required min={0} defaultValue={lead.whatsapp1} />
            <FormField label="WhatsApp2" name="whatsapp2" type="number" required min={0} defaultValue={lead.whatsapp2} />
            <FormField label="女包群" name="handbag_group" type="number" required min={0} defaultValue={lead.handbag_group} />
            <FormField label="双肩包群" name="backpack_group" type="number" required min={0} defaultValue={lead.backpack_group} />
          </div>
        </FormSection>

        <FormSection
          title="特殊情况 / 手动修正"
          description="正常情况下不用填写手动增加数；只有换群、历史数据修正、WhatsApp2 中途启用等情况，才需要手动覆盖系统计算值。"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <input
                name="is_handbag_group_reset"
                type="checkbox"
                defaultChecked={lead.is_handbag_group_reset}
                className="h-4 w-4 rounded border-slate-300"
              />
              是否女包群换群/重置
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <input
                name="is_backpack_group_reset"
                type="checkbox"
                defaultChecked={lead.is_backpack_group_reset}
                className="h-4 w-4 rounded border-slate-300"
              />
              是否双肩包群换群/重置
            </label>
            <FormField label="手动总增加数" name="total_increase_override" type="number" defaultValue={lead.total_increase_override ?? ""} />
            <FormField label="手动女包群增加数" name="handbag_group_increase_override" type="number" defaultValue={lead.handbag_group_increase_override ?? ""} />
            <FormField label="手动双肩包群增加数" name="backpack_group_increase_override" type="number" defaultValue={lead.backpack_group_increase_override ?? ""} />
          </div>
          <div className="mt-4">
            <FormField label="修正备注" name="increase_note" textarea defaultValue={lead.increase_note ?? ""} />
          </div>
        </FormSection>

        <FormSection title="当前系统计算结果" description="以下字段由数据库计算，仅展示，不可手动编辑。">
          <div className="grid gap-3 md:grid-cols-3">
            <ResultCard label="当前总增加数" value={lead.total_increase} />
            <ResultCard label="当前增加数-女包群" value={lead.handbag_group_increase} />
            <ResultCard label="当前增加数-双肩包群" value={lead.backpack_group_increase} />
          </div>
          <p className="mt-3 text-xs text-slate-500">如果填写了手动增加数，上方当前结果会优先使用手动值；留空则使用系统自动计算值。</p>
        </FormSection>

        <div className="mt-6 flex justify-end gap-3">
          <Button href="/daily-leads" variant="secondary">返回列表</Button>
          <Button type="submit">保存统计</Button>
        </div>
      </form>
    </AppShell>
  );
}

function ResultCard({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value ?? 0}</div>
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
