import { Badge } from "@/components/ui";

export function ShippingStatusBadge({ value }: { value?: string | null }) {
  const status = value || "未发货";
  if (status === "未发货") return <Badge tone="danger">未发货</Badge>;
  if (status === "备货中") return <Badge tone="warning">备货中</Badge>;
  if (status === "部分发货") return <Badge tone="info">部分发货</Badge>;
  if (status === "已发货") return <Badge tone="success">已发货</Badge>;
  return <Badge>{status}</Badge>;
}
