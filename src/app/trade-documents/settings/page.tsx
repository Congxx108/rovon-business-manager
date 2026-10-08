import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TradeSettingsEditor } from "@/components/trade-settings-editor";
import { requireUser } from "@/lib/auth";
import { readSettings } from "@/lib/trade-documents/server";
export const dynamic = "force-dynamic";
export default async function TradeSettingsPage() {
  await requireUser();
  const settings = await readSettings();
  return (
    <AppShell>
      <PageHeader
        title="单据设置"
        description="公司资料、币种、收款账户和常用条款。保存后仅影响后续新建单据。"
      />
      <TradeSettingsEditor
        initial={settings.data}
        revision={settings.revision}
      />
    </AppShell>
  );
}
