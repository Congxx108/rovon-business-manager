"use server";

import { revalidatePath } from "next/cache";
import { refreshCustomersFromOrders } from "@/lib/customers";
import { getDataCleanupPreview } from "@/lib/data";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export type DataCleanupState = {
  ok: boolean;
  message: string;
  summary?: {
    deletedOrders: number;
    deletedDailyLeads: number;
    refreshedCustomers: number;
  };
};

export async function cleanupTestDataAction(_previousState: DataCleanupState | null, formData: FormData): Promise<DataCleanupState> {
  const confirmation = formData.get("confirmation");
  if (confirmation !== "我确认只清理测试数据") {
    return { ok: false, message: "请输入确认文字：我确认只清理测试数据" };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase 环境变量尚未配置，无法清理数据。" };
  }

  const preview = await getDataCleanupPreview();
  if (preview.error) return { ok: false, message: `读取清理预览失败：${preview.error}` };

  const orderIds = preview.data.testOrders.map((order) => order.id);
  const leadIds = preview.data.testDailyLeads.map((lead) => lead.id);
  const supabase = getSupabaseAdminClient();

  if (orderIds.length) {
    const { error } = await supabase.from("orders").delete().in("id", orderIds);
    if (error) return { ok: false, message: `删除测试订单失败：${error.message}` };
  }

  if (leadIds.length) {
    const { error } = await supabase.from("daily_leads").delete().in("id", leadIds);
    if (error) return { ok: false, message: `删除测试每日潜客失败：${error.message}` };
  }

  const refreshedCustomers = await refreshCustomersFromOrders();
  const { error: recalculateError } = await supabase.rpc("recalculate_daily_leads");
  if (recalculateError) return { ok: false, message: `每日潜客增量重算失败：${recalculateError.message}` };

  revalidatePath("/data-cleanup");
  revalidatePath("/data-check");
  revalidatePath("/orders");
  revalidatePath("/daily-leads");
  revalidatePath("/customers");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: "测试数据清理完成，客户统计已刷新，每日潜客增量已重算。",
    summary: {
      deletedOrders: orderIds.length,
      deletedDailyLeads: leadIds.length,
      refreshedCustomers,
    },
  };
}
