"use server";

import { revalidatePath } from "next/cache";
import { refreshCustomersFromOrders } from "@/lib/customers";
import { orderImportSummary, type ParsedOrderImportRow } from "@/lib/imports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveOrderNumbers } from "@/lib/order-numbers";

export type OrderImportState = {
  ok: boolean;
  message: string;
  summary?: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    salesTotal: number;
    quantityTotal: number;
    importedRows: number;
  };
};

export type OrderImportPreviewState = {
  existingOrderNos: string[];
  error?: string;
};

export async function getOrderImportPreviewAction(orderNos: string[]): Promise<OrderImportPreviewState> {
  const uniqueOrderNos = Array.from(new Set(orderNos.map((orderNo) => orderNo.trim()).filter(Boolean)));
  if (!uniqueOrderNos.length) return { existingOrderNos: [] };

  const supabase = getSupabaseAdminClient();
  try {
    const resolved = await resolveOrderNumbers(supabase, uniqueOrderNos);
    return { existingOrderNos: Array.from(resolved.keys()) };
  } catch (error) {
    return { existingOrderNos: [], error: `订单编号识别失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

export async function importOrdersAction(_previousState: OrderImportState | null, formData: FormData): Promise<OrderImportState> {
  const rawRows = formData.get("rows");
  if (typeof rawRows !== "string" || !rawRows) {
    return { ok: false, message: "没有可导入的数据，请先选择 CSV 并确认预览。" };
  }

  let rows: ParsedOrderImportRow[];
  try {
    rows = JSON.parse(rawRows) as ParsedOrderImportRow[];
  } catch {
    return { ok: false, message: "导入数据格式无效，请重新选择 CSV。" };
  }

  const validRows = rows.filter((row) => row.errors.length === 0);
  if (!validRows.length) {
    return { ok: false, message: "没有通过校验的订单行。" };
  }

  const supabase = getSupabaseAdminClient();
  let resolved: Awaited<ReturnType<typeof resolveOrderNumbers>>;
  try {
    resolved = await resolveOrderNumbers(supabase, validRows.map((row) => row.order_no));
  } catch (error) {
    return { ok: false, message: `订单编号识别失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
  const identities = validRows.map((row) => resolved.get(row.order_no)?.order_id ?? row.order_no);
  if (new Set(identities).size !== identities.length) {
    return { ok: false, message: "CSV 中同一订单出现多次（可能同时包含新旧编号），请每个订单只保留一行后再导入。" };
  }
  const payload = validRows.map((row) => ({
    order_no: resolved.get(row.order_no)?.order_no ?? row.order_no,
    order_date: row.order_date,
    customer_name: row.customer_name ?? row.contact ?? "未命名客户",
    contact: row.contact,
    country: row.country,
    product_line: row.product_line,
    quantity: row.quantity,
    sales_amount_rmb: row.sales_amount_rmb,
    order_status: "已成交",
    payment_status: "已付全款",
    deposit_amount_rmb: 0,
    payment_currency: row.payment_currency,
    rmb_payment_method: row.rmb_payment_method,
    payment_remark: row.payment_remark,
    shipping_status: row.shipping_status,
    shipping_method: row.shipping_method,
    shipping_company: row.shipping_company,
    tracking_no: row.tracking_no,
    shipping_date: row.shipping_date,
    shipping_remark: row.shipping_remark,
    is_refund_or_cancelled: false,
    remark: row.remark,
  }));

  const { error } = await supabase.from("orders").upsert(payload, { onConflict: "order_no" });
  if (error) return { ok: false, message: `订单导入失败：${error.message}` };

  try {
    resolved = await resolveOrderNumbers(supabase, validRows.map((row) => row.order_no));
  } catch (error) {
    return { ok: false, message: `订单已写入，但明细编号识别失败；请修复后重新导入：${error instanceof Error ? error.message : "未知错误"}` };
  }
  if (validRows.some((row) => !resolved.has(row.order_no))) {
    return { ok: false, message: "订单已写入，但部分明细编号未识别，请重新导入。" };
  }

  const orderIds = Array.from(new Set(validRows.map((row) => resolved.get(row.order_no)!.order_id)));
  if (orderIds.length) {
    const { error: deleteItemsError } = await supabase.from("order_items").delete().in("order_id", orderIds);
    if (deleteItemsError) return { ok: false, message: `订单明细更新失败：${deleteItemsError.message}` };

    const itemPayload = validRows
      .map((row) => {
        const orderId = resolved.get(row.order_no)?.order_id;
        if (!orderId) return null;
        return {
          order_id: orderId,
          product_line: row.product_line ?? "女包",
          quantity: row.quantity,
          sales_amount_rmb: row.sales_amount_rmb,
          sort_order: 0,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (itemPayload.length) {
      const { error: insertItemsError } = await supabase.from("order_items").insert(itemPayload);
      if (insertItemsError) return { ok: false, message: `订单明细写入失败：${insertItemsError.message}` };
    }
  }

  await refreshCustomersFromOrders();

  revalidatePath("/orders");
  revalidatePath("/customers");
  revalidatePath("/dashboard");

  const summary = orderImportSummary(rows);
  return {
    ok: true,
    message: "订单导入完成，客户统计已刷新。",
    summary: {
      ...summary,
      importedRows: validRows.length,
    },
  };
}
