import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { OrderImportClient } from "@/app/orders/import/order-import-client";

export default function OrdersImportPage() {
  return (
    <AppShell>
      <PageHeader
        title="导入历史订单"
        description="支持 CSV 模板、UTF-8/GBK 编码识别、导入前预览和同订单编号更新。"
      />
      <OrderImportClient />
    </AppShell>
  );
}
