"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { refreshCustomersFromOrders } from "@/lib/customers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function refreshCustomerStatsAction() {
  await refreshCustomersFromOrders();

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  redirect("/customers?refreshed=1");
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function updateCustomerFollowFields(id: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("customers")
    .update({
      last_follow_date: textValue(formData, "last_follow_date"),
      last_follow_result: textValue(formData, "last_follow_result"),
      next_follow_date: textValue(formData, "next_follow_date"),
      remark: textValue(formData, "remark"),
    })
    .eq("id", id);

  if (error) {
    redirect(`/customers/${id}/edit?error=${encodeURIComponent(`保存失败：${error.message}`)}`);
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}/edit?saved=1`);
}
