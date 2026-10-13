import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type OrderNumberPreview = { orderNo: string | null; error?: string };

// Read only: previews never allocate, reserve, or submit an order number.
export async function readOrderNumberPreview(supabase: SupabaseClient, orderDate: string): Promise<OrderNumberPreview> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) return { orderNo: null, error: "请先填写有效订单日期" };
  const date = new Date(`${orderDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== orderDate) {
    return { orderNo: null, error: "请先填写有效订单日期" };
  }
  const period = `${orderDate.slice(2, 4)}${orderDate.slice(5, 7)}`;
  const { data, error } = await supabase.from("order_number_counters").select("last_value").eq("period", period).maybeSingle();
  if (error) return { orderNo: null, error: "暂时无法预览，保存时仍会自动编号" };
  const lastValue = Number(data?.last_value ?? 0);
  if (!Number.isSafeInteger(lastValue) || lastValue < 0) return { orderNo: null, error: "暂时无法预览，保存时仍会自动编号" };

  // Also honor reserved aliases, including identifiers of deleted orders.
  for (let offset = 1; offset <= 64; offset += 16) {
    const candidates = Array.from({ length: 16 }, (_, i) => `R${period}-${String(lastValue + offset + i).padStart(3, "0")}`);
    const [aliases, orders] = await Promise.all([
      supabase.from("order_number_aliases").select("order_no").in("order_no", candidates),
      supabase.from("orders").select("order_no").in("order_no", candidates),
    ]);
    if (aliases.error || orders.error) return { orderNo: null, error: "暂时无法预览，保存时仍会自动编号" };
    const occupied = new Set([...(aliases.data ?? []), ...(orders.data ?? [])].map((row) => row.order_no));
    const orderNo = candidates.find((candidate) => !occupied.has(candidate));
    if (orderNo) return { orderNo };
  }
  return { orderNo: null, error: "暂时无法预览，保存时仍会自动编号" };
}
