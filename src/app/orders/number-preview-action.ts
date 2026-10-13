"use server";

import { requireUser } from "@/lib/auth";
import { readOrderNumberPreview, type OrderNumberPreview } from "@/lib/order-number-preview";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getOrderNumberPreviewAction(orderDate: string): Promise<OrderNumberPreview> {
  await requireUser();
  try {
    return await readOrderNumberPreview(getSupabaseAdminClient(), orderDate);
  } catch {
    return { orderNo: null, error: "暂时无法预览，保存时仍会自动编号" };
  }
}
