import { AppShell } from "@/components/app-shell";
import { FormField } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { Button, FormSection } from "@/components/ui";
import { createDailyLead, updateExistingDailyLead } from "@/app/daily-leads/actions";
import { todayString } from "@/lib/csv";

export default async function NewDailyLeadPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    exists?: string;
    saved?: string;
    updated?: string;
    stat_date?: string;
    facebook_leads?: string;
    whatsapp1?: string;
    whatsapp2?: string;
    handbag_group?: string;
    backpack_group?: string;
    total_increase?: string;
    handbag_group_increase?: string;
    backpack_group_increase?: string;
  }>;
}) {
  const params = await searchParams;
  const { error } = params;

  return (
    <AppShell>
      <PageHeader title="新增每日潜客统计" description="只填写当天累计数；总增加数、女包群增加数、双肩包群增加数由数据库触发器自动计算。" />

      {error ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {params.saved || params.updated ? (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <div className="font-medium">{params.updated ? "更新成功，系统已重新计算增量。" : "保存成功，系统已自动计算增量。"}</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <ResultCard label="总增加数" value={params.total_increase ?? 0} />
            <ResultCard label="增加数-女包群" value={params.handbag_group_increase ?? 0} />
            <ResultCard label="增加数-双肩包群" value={params.backpack_group_increase ?? 0} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button href="/daily-leads/new">继续录入</Button>
            <Button href="/daily-leads" variant="secondary">返回列表</Button>
          </div>
        </div>
      ) : null}
      {params.exists ? (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <div className="font-medium">该日期已存在。</div>
          <p className="mt-1">可以更新该日期记录，或取消返回列表。</p>
          <form action={updateExistingDailyLead} className="mt-3 inline-flex gap-3">
            {["stat_date", "facebook_leads", "whatsapp1", "whatsapp2", "handbag_group", "backpack_group"].map((name) => (
              <input key={name} type="hidden" name={name} value={params[name as keyof typeof params] ?? ""} />
            ))}
            <Button type="submit" variant="warning">更新该日期记录</Button>
            <Button href="/daily-leads" variant="secondary">取消</Button>
          </form>
        </div>
      ) : null}

      <form action={createDailyLead} className="max-w-3xl space-y-5">
        <FormSection title="当天累计数" description="这里只填写累计人数；三个增加数字段保存后自动计算，不需要手工填写。">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="日期" name="stat_date" type="date" required defaultValue={todayString()} />
            <FormField label="Facebook后台潜在客户" name="facebook_leads" type="number" required defaultValue={0} min={0} />
            <FormField label="WhatsApp1" name="whatsapp1" type="number" required defaultValue={0} min={0} />
            <FormField label="WhatsApp2" name="whatsapp2" type="number" required defaultValue={0} min={0} />
            <FormField label="女包群" name="handbag_group" type="number" required defaultValue={0} min={0} />
            <FormField label="双肩包群" name="backpack_group" type="number" required defaultValue={0} min={0} />
          </div>
        </FormSection>

        <div className="mt-6 flex justify-end">
          <Button type="submit">保存统计</Button>
        </div>
      </form>
    </AppShell>
  );
}

function ResultCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-white/70 px-3 py-2">
      <div className="text-xs text-emerald-700">{label}</div>
      <div className="mt-1 text-lg font-semibold text-emerald-950">{value}</div>
    </div>
  );
}
