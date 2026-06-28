import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function refreshCustomersFromOrders() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("refresh_customers_from_orders");

  if (error) {
    throw new Error(`刷新客户统计失败：${error.message}`);
  }

  return Number(data ?? 0);
}
