import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusNote } from "@/components/status-note";
import { CleanupClient } from "@/app/data-cleanup/cleanup-client";
import { getDataCleanupPreview } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DataCleanupPage() {
  const result = await getDataCleanupPreview();

  return (
    <AppShell>
      <PageHeader title="测试数据清理" description="真实数据导入前，先预览并清理明确测试数据。不会清空真实业务数据。" />
      <StatusNote configured={result.configured} error={result.error} />
      <CleanupClient preview={result.data} />
    </AppShell>
  );
}
