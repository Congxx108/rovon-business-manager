import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DailyLeadImportClient } from "@/app/daily-leads/import/daily-lead-import-client";

export default function DailyLeadsImportPage() {
  return (
    <AppShell>
      <PageHeader
        title="导入每日潜客统计"
        description="同日期会覆盖更新；导入前后都会校验 CSV 原增量和系统计算增量差异。"
      />
      <DailyLeadImportClient />
    </AppShell>
  );
}
