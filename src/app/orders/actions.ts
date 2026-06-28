"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { refreshCustomersFromOrders } from "@/lib/customers";
import { needsShippingInfoReminder, normalizeShippingMethod, normalizeShippingStatus } from "@/lib/shipping";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value ? Number(value) : 0;
}

function redirectWithOrderError(message: string): never {
  redirect(`/orders/new?error=${encodeURIComponent(message)}`);
}

function redirectWithEditOrderError(id: string, message: string): never {
  redirect(`/orders/${id}/edit?error=${encodeURIComponent(message)}`);
}

function generatedOrderNo(orderDate: string | null) {
  const datePart = (orderDate ?? new Date().toISOString().slice(0, 10)).replaceAll("-", "");
  const timePart = new Date().toISOString().replace(/\D/g, "").slice(8, 14);
  return `ROVON-${datePart}-${timePart}`;
}

function shippingPayload(formData: FormData) {
  const shippingStatus = normalizeShippingStatus(textValue(formData, "shipping_status"));
  return {
    shipping_status: shippingStatus,
    shipping_method: normalizeShippingMethod(textValue(formData, "shipping_method")),
    shipping_company: textValue(formData, "shipping_company"),
    tracking_no: textValue(formData, "tracking_no"),
    shipping_date: textValue(formData, "shipping_date"),
    shipping_remark: textValue(formData, "shipping_remark"),
  };
}

export async function createOrder(formData: FormData) {
  const supabase = getSupabaseAdminClient();
  const orderDate = textValue(formData, "order_date");
  const customerName = textValue(formData, "customer_name");
  const contact = textValue(formData, "contact");
  const country = textValue(formData, "country");
  const productLine = textValue(formData, "product_line");
  const quantity = numberValue(formData, "quantity");
  const salesAmountRmb = numberValue(formData, "sales_amount_rmb");

  if (!orderDate) redirectWithOrderError("订单日期不能为空");
  if (!customerName && !contact) redirectWithOrderError("客户名或联系方式至少填写一个");
  if (!country) redirectWithOrderError("国家/渠道不能为空");
  if (!productLine) redirectWithOrderError("产品线不能为空");
  if (quantity < 0) redirectWithOrderError("数量不能小于 0");
  if (salesAmountRmb < 0) redirectWithOrderError("销售额不能小于 0");

  const shipping = shippingPayload(formData);
  const payload = {
    order_no: textValue(formData, "order_no") ?? generatedOrderNo(orderDate),
    order_date: orderDate,
    customer_name: customerName ?? contact,
    contact,
    country,
    product_line: productLine,
    quantity,
    sales_amount_rmb: salesAmountRmb,
    order_status: textValue(formData, "order_status") ?? "未处理",
    payment_status: textValue(formData, "payment_status") ?? "未付款",
    ...shipping,
    is_refund_or_cancelled: formData.get("is_refund_or_cancelled") === "on",
    remark: textValue(formData, "remark"),
  };

  const { error } = await supabase.from("orders").insert(payload);

  if (error) {
    redirectWithOrderError(`订单保存失败：${error.message}`);
  }

  await refreshCustomersFromOrders();

  revalidatePath("/orders");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  const warning = needsShippingInfoReminder(shipping.shipping_status, shipping.tracking_no, shipping.shipping_date) ? "&shippingWarning=1" : "";
  redirect(`/orders/new?saved=1${warning}`);
}

export async function updateOrder(id: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();
  const orderDate = textValue(formData, "order_date");
  const customerName = textValue(formData, "customer_name");
  const contact = textValue(formData, "contact");
  const country = textValue(formData, "country");
  const productLine = textValue(formData, "product_line");
  const quantity = numberValue(formData, "quantity");
  const salesAmountRmb = numberValue(formData, "sales_amount_rmb");

  if (!orderDate) redirectWithEditOrderError(id, "订单日期不能为空");
  if (!customerName && !contact) redirectWithEditOrderError(id, "客户名或联系方式至少填写一个");
  if (!country) redirectWithEditOrderError(id, "国家/渠道不能为空");
  if (!productLine) redirectWithEditOrderError(id, "产品线不能为空");
  if (quantity < 0) redirectWithEditOrderError(id, "数量不能小于 0");
  if (salesAmountRmb < 0) redirectWithEditOrderError(id, "销售额不能小于 0");

  const shipping = shippingPayload(formData);
  const { error } = await supabase
    .from("orders")
    .update({
      order_no: textValue(formData, "order_no") ?? generatedOrderNo(orderDate),
      order_date: orderDate,
      customer_name: customerName ?? contact,
      contact,
      country,
      product_line: productLine,
      quantity,
      sales_amount_rmb: salesAmountRmb,
      order_status: textValue(formData, "order_status") ?? "已成交",
      payment_status: textValue(formData, "payment_status") ?? "已付全款",
      ...shipping,
      is_refund_or_cancelled: formData.get("is_refund_or_cancelled") === "on",
      remark: textValue(formData, "remark"),
    })
    .eq("id", id);

  if (error) redirectWithEditOrderError(id, `订单更新失败：${error.message}`);

  await refreshCustomersFromOrders();
  revalidatePath("/orders");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  const warning = needsShippingInfoReminder(shipping.shipping_status, shipping.tracking_no, shipping.shipping_date) ? "&shippingWarning=1" : "";
  redirect(`/orders/${id}/edit?saved=1${warning}`);
}

export async function markOrderCancelled(id: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({
      is_refund_or_cancelled: true,
      order_status: "已取消/退款",
    })
    .eq("id", id);

  if (error) redirectWithEditOrderError(id, `标记取消/退款失败：${error.message}`);

  await refreshCustomersFromOrders();
  revalidatePath("/orders");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  redirect(`/orders/${id}/edit?saved=1&cancelled=1`);
}

export async function markOrderShipped(id: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({
      shipping_status: "已发货",
      shipping_method: normalizeShippingMethod(textValue(formData, "shipping_method")),
      shipping_company: textValue(formData, "shipping_company"),
      tracking_no: textValue(formData, "tracking_no"),
      shipping_date: textValue(formData, "shipping_date"),
      shipping_remark: textValue(formData, "shipping_remark"),
    })
    .eq("id", id);

  if (error) redirectWithEditOrderError(id, `标记已发货失败：${error.message}`);

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/data-check");
  const returnTo = textValue(formData, "return_to");
  redirect(returnTo?.startsWith("/") ? returnTo : "/orders?pendingShipping=1");
}
