"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { refreshCustomersFromOrders } from "@/lib/customers";
import { needsShippingInfoReminder, normalizeShippingMethod, normalizeShippingStatus } from "@/lib/shipping";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ParsedOrderItem = {
  product_line: string;
  quantity: number;
  sales_amount_rmb: number;
  sort_order: number;
};

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

function paymentPayload(formData: FormData) {
  const paymentStatus = textValue(formData, "payment_status") === "定金" ? "定金" : "已付全款";
  return {
    payment_status: paymentStatus,
    deposit_amount_rmb: paymentStatus === "定金" ? numberValue(formData, "deposit_amount_rmb") : 0,
  };
}

function orderItemsFromFormData(formData: FormData) {
  const productLines = formData.getAll("item_product_line");
  const quantities = formData.getAll("item_quantity");
  const salesAmounts = formData.getAll("item_sales_amount_rmb");

  return productLines
    .map((value, index): ParsedOrderItem => ({
      product_line: typeof value === "string" && value.trim() ? value.trim() : "",
      quantity: typeof quantities[index] === "string" && quantities[index].trim() ? Number(quantities[index]) : 0,
      sales_amount_rmb: typeof salesAmounts[index] === "string" && salesAmounts[index].trim() ? Number(salesAmounts[index]) : 0,
      sort_order: index,
    }))
    .filter((item) => item.product_line || item.quantity > 0 || item.sales_amount_rmb > 0);
}

function validateOrderItems(items: ParsedOrderItem[], onError: (message: string) => never) {
  if (!items.length) onError("请至少填写一条产品明细");

  for (const item of items) {
    if (!item.product_line) onError("产品类目不能为空");
    if (!Number.isFinite(item.quantity) || item.quantity < 0) onError("产品明细数量不能小于 0");
    if (!Number.isFinite(item.sales_amount_rmb) || item.sales_amount_rmb < 0) onError("产品明细销售额不能小于 0");
  }
}

function orderItemsSummary(items: ParsedOrderItem[]) {
  const productLines = Array.from(new Set(items.map((item) => item.product_line).filter(Boolean)));
  return {
    productLine: productLines.length === 1 ? productLines[0] : "混合",
    quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    salesAmountRmb: items.reduce((sum, item) => sum + item.sales_amount_rmb, 0),
  };
}

async function replaceOrderItems(orderId: string, items: ParsedOrderItem[]) {
  const supabase = getSupabaseAdminClient();
  const { error: deleteError } = await supabase.from("order_items").delete().eq("order_id", orderId);
  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabase.from("order_items").insert(
    items.map((item) => ({
      order_id: orderId,
      product_line: item.product_line,
      quantity: item.quantity,
      sales_amount_rmb: item.sales_amount_rmb,
      sort_order: item.sort_order,
    })),
  );
  if (insertError) throw new Error(insertError.message);
}

export async function createOrder(formData: FormData) {
  const supabase = getSupabaseAdminClient();
  const orderDate = textValue(formData, "order_date");
  const customerName = textValue(formData, "customer_name");
  const contact = textValue(formData, "contact");
  const country = textValue(formData, "country");
  const items = orderItemsFromFormData(formData);
  const shipping = shippingPayload(formData);
  const payment = paymentPayload(formData);

  validateOrderItems(items, redirectWithOrderError);
  const summary = orderItemsSummary(items);

  if (!orderDate) redirectWithOrderError("订单日期不能为空");
  if (!customerName && !contact) redirectWithOrderError("客户名或联系方式至少填写一个");
  if (!country) redirectWithOrderError("国家/渠道不能为空");
  if (payment.deposit_amount_rmb < 0) redirectWithOrderError("定金金额不能小于 0");

  const payload = {
    order_no: textValue(formData, "order_no") ?? generatedOrderNo(orderDate),
    order_date: orderDate,
    customer_name: customerName ?? contact,
    contact,
    country,
    product_line: summary.productLine,
    quantity: summary.quantity,
    sales_amount_rmb: summary.salesAmountRmb,
    order_status: "已成交",
    ...payment,
    ...shipping,
    is_refund_or_cancelled: formData.get("is_refund_or_cancelled") === "on",
    remark: textValue(formData, "remark"),
  };

  const { data: insertedOrder, error } = await supabase.from("orders").insert(payload).select("id").single();
  if (error) redirectWithOrderError(`订单保存失败：${error.message}`);
  if (!insertedOrder?.id) redirectWithOrderError("订单保存失败：未返回订单 ID");

  try {
    await replaceOrderItems(insertedOrder.id, items);
  } catch (itemError) {
    redirectWithOrderError(`订单明细保存失败：${itemError instanceof Error ? itemError.message : "未知错误"}`);
  }

  await refreshCustomersFromOrders();

  revalidatePath("/orders");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  const warning = needsShippingInfoReminder(shipping.shipping_status, shipping.tracking_no, shipping.shipping_date) ? "&shippingWarning=1" : "";
  if (textValue(formData, "after_save") === "orders") {
    redirect(`/orders?saved=1${warning}`);
  }
  redirect(`/orders/new?saved=1${warning}`);
}

export async function updateOrder(id: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();
  const orderDate = textValue(formData, "order_date");
  const customerName = textValue(formData, "customer_name");
  const contact = textValue(formData, "contact");
  const country = textValue(formData, "country");
  const items = orderItemsFromFormData(formData);
  const shipping = shippingPayload(formData);
  const payment = paymentPayload(formData);

  validateOrderItems(items, (message) => redirectWithEditOrderError(id, message));
  const summary = orderItemsSummary(items);

  if (!orderDate) redirectWithEditOrderError(id, "订单日期不能为空");
  if (!customerName && !contact) redirectWithEditOrderError(id, "客户名或联系方式至少填写一个");
  if (!country) redirectWithEditOrderError(id, "国家/渠道不能为空");
  if (payment.deposit_amount_rmb < 0) redirectWithEditOrderError(id, "定金金额不能小于 0");

  const { error } = await supabase
    .from("orders")
    .update({
      order_no: textValue(formData, "order_no") ?? generatedOrderNo(orderDate),
      order_date: orderDate,
      customer_name: customerName ?? contact,
      contact,
      country,
      product_line: summary.productLine,
      quantity: summary.quantity,
      sales_amount_rmb: summary.salesAmountRmb,
      order_status: "已成交",
      ...payment,
      ...shipping,
      is_refund_or_cancelled: formData.get("is_refund_or_cancelled") === "on",
      remark: textValue(formData, "remark"),
    })
    .eq("id", id);

  if (error) redirectWithEditOrderError(id, `订单更新失败：${error.message}`);

  try {
    await replaceOrderItems(id, items);
  } catch (itemError) {
    redirectWithEditOrderError(id, `订单明细保存失败：${itemError instanceof Error ? itemError.message : "未知错误"}`);
  }

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
