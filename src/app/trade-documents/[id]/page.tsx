import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TradeDocumentEditor } from "@/components/trade-document-editor";
import { requireUser } from "@/lib/auth";
import { getOrders, getOrderById } from "@/lib/data";
import {
  readDocument,
  readSettings,
  readVersions,
} from "@/lib/trade-documents/server";
import { DOCUMENT_TYPES } from "@/lib/trade-documents/model";
export const dynamic = "force-dynamic";
export default async function EditTradeDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const [doc, settings, orders, versions] = await Promise.all([
    readDocument(id),
    readSettings(),
    getOrders({}, 200),
    readVersions(id),
  ]);
  if (doc.order_id && !orders.data.some((x) => x.id === doc.order_id)) {
    const result = await getOrderById(doc.order_id);
    if (result.data) orders.data.unshift(result.data);
  }
  return (
    <AppShell>
      <PageHeader
        title={`${DOCUMENT_TYPES[doc.document_type]} · ${doc.document_no}`}
        description="已出具单据修改后保存为修订草稿，再次确认出具会生成新版本并保留旧 PDF。"
      />
      <TradeDocumentEditor
        key={doc.id}
        initial={doc}
        initialData={doc.data}
        type={doc.document_type}
        settings={settings.data}
        orders={orders.data}
        versions={versions}
        sourceId={doc.source_document_id}
      />
    </AppShell>
  );
}
