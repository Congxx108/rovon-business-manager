"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value ? Number(value) : 0;
}

function optionalNumberValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function redirectWithDailyLeadError(message: string): never {
  redirect(`/daily-leads/new?error=${encodeURIComponent(message)}`);
}

function redirectWithDailyLeadListError(message: string): never {
  redirect(`/daily-leads?error=${encodeURIComponent(message)}`);
}

function redirectWithEditDailyLeadError(id: string, message: string): never {
  redirect(`/daily-leads/${id}/edit?error=${encodeURIComponent(message)}`);
}

function dailyLeadPayload(formData: FormData) {
  return {
    facebook_leads: numberValue(formData, "facebook_leads"),
    whatsapp1: numberValue(formData, "whatsapp1"),
    whatsapp2: numberValue(formData, "whatsapp2"),
    handbag_group: numberValue(formData, "handbag_group"),
    backpack_group: numberValue(formData, "backpack_group"),
  };
}

function manualIncreasePayload(formData: FormData) {
  return {
    total_increase_override: optionalNumberValue(formData, "total_increase_override"),
    handbag_group_increase_override: optionalNumberValue(formData, "handbag_group_increase_override"),
    backpack_group_increase_override: optionalNumberValue(formData, "backpack_group_increase_override"),
    is_handbag_group_reset: formData.get("is_handbag_group_reset") === "on",
    is_backpack_group_reset: formData.get("is_backpack_group_reset") === "on",
    increase_note: textValue(formData, "increase_note"),
  };
}

export async function createDailyLead(formData: FormData) {
  const supabase = getSupabaseAdminClient();
  const statDate = textValue(formData, "stat_date");
  const facebookLeads = numberValue(formData, "facebook_leads");
  const whatsapp1 = numberValue(formData, "whatsapp1");
  const whatsapp2 = numberValue(formData, "whatsapp2");
  const handbagGroup = numberValue(formData, "handbag_group");
  const backpackGroup = numberValue(formData, "backpack_group");

  if (!statDate) redirectWithDailyLeadError("日期不能为空");
  if ([facebookLeads, whatsapp1, whatsapp2, handbagGroup, backpackGroup].some((value) => value < 0)) {
    redirectWithDailyLeadError("潜客和群人数不能小于 0");
  }

  const payload = {
    stat_date: statDate,
    facebook_leads: facebookLeads,
    whatsapp1,
    whatsapp2,
    handbag_group: handbagGroup,
    backpack_group: backpackGroup,
  };

  const { error } = await supabase.from("daily_leads").insert(payload);

  if (error) {
    if (error.code === "23505") {
      const query = new URLSearchParams({
        exists: "1",
        stat_date: statDate,
        facebook_leads: String(facebookLeads),
        whatsapp1: String(whatsapp1),
        whatsapp2: String(whatsapp2),
        handbag_group: String(handbagGroup),
        backpack_group: String(backpackGroup),
      });
      redirect(`/daily-leads/new?${query.toString()}`);
    }
    redirectWithDailyLeadError(`每日潜客保存失败：${error.message}`);
  }

  const { data } = await supabase
    .from("daily_leads")
    .select("total_increase,handbag_group_increase,backpack_group_increase")
    .eq("stat_date", statDate)
    .single();

  revalidatePath("/daily-leads");
  revalidatePath("/dashboard");
  revalidatePath("/data-check");
  const successQuery = new URLSearchParams({
    saved: "1",
    total_increase: String(data?.total_increase ?? 0),
    handbag_group_increase: String(data?.handbag_group_increase ?? 0),
    backpack_group_increase: String(data?.backpack_group_increase ?? 0),
  });
  redirect(`/daily-leads/new?${successQuery.toString()}`);
}

export async function quickCreateDailyLead(formData: FormData) {
  const supabase = getSupabaseAdminClient();
  const statDate = textValue(formData, "stat_date");
  const payload = dailyLeadPayload(formData);

  if (!statDate) redirectWithDailyLeadListError("日期不能为空");
  if (Object.values(payload).some((value) => value < 0)) {
    redirectWithDailyLeadListError("潜客和群人数不能小于 0");
  }

  const { error } = await supabase.from("daily_leads").insert({
    stat_date: statDate,
    ...payload,
  });

  if (error) {
    if (error.code === "23505") {
      const query = new URLSearchParams({
        exists: "1",
        stat_date: statDate,
        facebook_leads: String(payload.facebook_leads),
        whatsapp1: String(payload.whatsapp1),
        whatsapp2: String(payload.whatsapp2),
        handbag_group: String(payload.handbag_group),
        backpack_group: String(payload.backpack_group),
      });
      redirect(`/daily-leads?${query.toString()}`);
    }
    redirectWithDailyLeadListError(`每日潜客保存失败：${error.message}`);
  }

  revalidatePath("/daily-leads");
  revalidatePath("/dashboard");
  revalidatePath("/data-check");
  redirect("/daily-leads?saved=1");
}

export async function quickUpdateExistingDailyLead(formData: FormData) {
  const supabase = getSupabaseAdminClient();
  const statDate = textValue(formData, "stat_date");
  const payload = dailyLeadPayload(formData);

  if (!statDate) redirectWithDailyLeadListError("日期不能为空");

  const { error } = await supabase
    .from("daily_leads")
    .update(payload)
    .eq("stat_date", statDate);

  if (error) redirectWithDailyLeadListError(`更新失败：${error.message}`);

  revalidatePath("/daily-leads");
  revalidatePath("/dashboard");
  revalidatePath("/data-check");
  redirect("/daily-leads?updated=1");
}

export async function updateExistingDailyLead(formData: FormData) {
  const supabase = getSupabaseAdminClient();
  const statDate = textValue(formData, "stat_date");
  const facebookLeads = numberValue(formData, "facebook_leads");
  const whatsapp1 = numberValue(formData, "whatsapp1");
  const whatsapp2 = numberValue(formData, "whatsapp2");
  const handbagGroup = numberValue(formData, "handbag_group");
  const backpackGroup = numberValue(formData, "backpack_group");

  if (!statDate) redirectWithDailyLeadError("日期不能为空");

  const { error } = await supabase
    .from("daily_leads")
    .update({
      facebook_leads: facebookLeads,
      whatsapp1,
      whatsapp2,
      handbag_group: handbagGroup,
      backpack_group: backpackGroup,
      ...manualIncreasePayload(formData),
    })
    .eq("stat_date", statDate);

  if (error) redirectWithDailyLeadError(`更新失败：${error.message}`);

  const { data } = await supabase
    .from("daily_leads")
    .select("total_increase,handbag_group_increase,backpack_group_increase")
    .eq("stat_date", statDate)
    .single();

  revalidatePath("/daily-leads");
  revalidatePath("/dashboard");
  revalidatePath("/data-check");
  const query = new URLSearchParams({
    updated: "1",
    total_increase: String(data?.total_increase ?? 0),
    handbag_group_increase: String(data?.handbag_group_increase ?? 0),
    backpack_group_increase: String(data?.backpack_group_increase ?? 0),
  });
  redirect(`/daily-leads/new?${query.toString()}`);
}

export async function updateDailyLead(id: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();
  const statDate = textValue(formData, "stat_date");
  const facebookLeads = numberValue(formData, "facebook_leads");
  const whatsapp1 = numberValue(formData, "whatsapp1");
  const whatsapp2 = numberValue(formData, "whatsapp2");
  const handbagGroup = numberValue(formData, "handbag_group");
  const backpackGroup = numberValue(formData, "backpack_group");

  if (!statDate) redirectWithEditDailyLeadError(id, "日期不能为空");
  if ([facebookLeads, whatsapp1, whatsapp2, handbagGroup, backpackGroup].some((value) => value < 0)) {
    redirectWithEditDailyLeadError(id, "潜客和群人数不能小于 0");
  }

  const { error } = await supabase
    .from("daily_leads")
    .update({
      stat_date: statDate,
      facebook_leads: facebookLeads,
      whatsapp1,
      whatsapp2,
      handbag_group: handbagGroup,
      backpack_group: backpackGroup,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      redirectWithEditDailyLeadError(id, "该日期已存在，手动编辑不会覆盖另一条记录");
    }
    redirectWithEditDailyLeadError(id, `每日潜客更新失败：${error.message}`);
  }

  const { data } = await supabase
    .from("daily_leads")
    .select("total_increase,handbag_group_increase,backpack_group_increase")
    .eq("id", id)
    .single();

  revalidatePath("/daily-leads");
  revalidatePath("/dashboard");
  revalidatePath("/data-check");
  const query = new URLSearchParams({
    saved: "1",
    total_increase: String(data?.total_increase ?? 0),
    handbag_group_increase: String(data?.handbag_group_increase ?? 0),
    backpack_group_increase: String(data?.backpack_group_increase ?? 0),
  });
  redirect(`/daily-leads/${id}/edit?${query.toString()}`);
}
