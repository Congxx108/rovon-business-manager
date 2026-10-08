import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TradeDocumentEditor } from "@/components/trade-document-editor";
import { requireUser } from "@/lib/auth";
import { getOrders, getOrderById, getOrderItemsByOrderId } from "@/lib/data";
import {
  DOCUMENT_TYPES,
  emptyItem,
  isDocumentType,
  newTradeData,
} from "@/lib/trade-documents/model";
import {
  readDocument,
  readSettings,
  requireUuid,
} from "@/lib/trade-documents/server";
export const dynamic = "force-dynamic";
export default async function NewTradeDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; order?: string; copy?: string }>;
}) {
  await requireUser();
  const p = await searchParams,
    type = isDocumentType(p.type) ? p.type : "pi";
  const [settings, orderResult] = await Promise.all([
    readSettings(),
    getOrders({}, 200),
  ]);
  let data = newTradeData(settings.data),
    orderId = p.order ?? "",
    sourceId: string | null = null;
  if (p.copy) {
    const source = await readDocument(requireUuid(p.copy));
    data = structuredClone(source.data);
    sourceId = source.id;
    orderId = source.order_id ?? "";
    if (type === "packing")
      data.invoice_reference =
        source.document_type === "packing"
          ? source.data.invoice_reference
          : source.document_no;
    if (type !== "pi") data.valid_until = "";
  } else if (orderId) {
    const result = await getOrderById(requireUuid(orderId));
    if (!result.data) throw new Error("关联订单不存在");
    const order = result.data;
    data.buyer.name = order.customer_name;
    data.buyer.phone = order.contact ?? "";
    const items = await getOrderItemsByOrderId(order);
    data.items = items.data.map((x, i) => ({
      ...emptyItem(`item-${i + 1}`),
      description: x.product_line ?? "",
      quantity: String(x.quantity),
    }));
    if (!data.items.length) data.items = [emptyItem("item-1")];
    data.shipment_label = order.order_no;
    if (!orderResult.data.some((x) => x.id === order.id))
      orderResult.data.unshift(order);
  }
  if (orderId && !orderResult.data.some((x) => x.id === orderId)) {
    const result = await getOrderById(orderId);
    if (result.data) orderResult.data.unshift(result.data);
  }
  return (
    <AppShell>
      <PageHeader
        title={`新建 ${DOCUMENT_TYPES[type]}`}
        description={
          sourceId
            ? "已复制原单资料，保存后生成独立的新编号。请核对本次成交、银行与实际出货资料。"
            : "可独立制作，也可选择关联已有订单。"
        }
      />
      <TradeDocumentEditor
        key={`${type}:${p.copy ?? ""}:${p.order ?? ""}`}
        initialData={data}
        type={type}
        settings={settings.data}
        orders={orderResult.data}
        sourceId={sourceId}
        initialOrderId={orderId}
      />
    </AppShell>
  );
}
