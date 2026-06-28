"use server";

import { revalidatePath } from "next/cache";
import { refreshCustomersFromOrders } from "@/lib/customers";
import { orderImportSummary, type ParsedOrderImportRow } from "@/lib/imports";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
};

export async function getOrderImportPreviewAction(orderNos: string[]): Promise<OrderImportPreviewState> {
  const uniqueOrderNos = Array.from(new Set(orderNos.map((orderNo) => orderNo.trim()).filter(Boolean)));
  if (!uniqueOrderNos.length) return { existingOrderNos: [] };

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("orders").select("order_no").in("order_no", uniqueOrderNos);

  if (error) return { existingOrderNos: [] };
  return { existingOrderNos: (data ?? []).map((row) => row.order_no).filter(Boolean) };
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
  const payload = validRows.map((row) => ({
    order_no: row.order_no,
    order_date: row.order_date,
    customer_name: row.customer_name ?? row.contact ?? "未命名客户",
    contact: row.contact,
    country: row.country,
    product_line: row.product_line,
    quantity: row.quantity,
    sales_amount_rmb: row.sales_amount_rmb,
    order_status: "已成交",
    payment_status: "已付全款",
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
