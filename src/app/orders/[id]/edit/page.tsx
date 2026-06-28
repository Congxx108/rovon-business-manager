import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FormField } from "@/components/form-field";
import { CustomerAutocompleteFields, OrderItemsInput, PaymentFields } from "@/components/order-form-controls";
import { PageHeader } from "@/components/page-header";
import { Button, FormSection } from "@/components/ui";
import { markOrderCancelled, updateOrder } from "@/app/orders/actions";
import { getOrderById, getOrderItemsByOrderId } from "@/lib/data";
import { SHIPPING_METHODS, SHIPPING_STATUSES } from "@/lib/shipping";

export const dynamic = "force-dynamic";

export default async function EditOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; cancelled?: string; shippingWarning?: string }>;
}) {
  const { id } = await params;
  const { error, saved, cancelled, shippingWarning } = await searchParams;
  const result = await getOrderById(id);
  const order = result.data;
  if (!order) notFound();
  const orderItemsResult = await getOrderItemsByOrderId(order);

  const saveAction = updateOrder.bind(null, id);
  const cancelAction = markOrderCancelled.bind(null, id);

  return (
    <AppShell>
      <PageHeader title="编辑订单" description="修改订单后会自动刷新客户统计。删除订单暂不做物理删除，请使用取消/退款标记。" />

      {error ? <Message tone="error" text={error} /> : null}
      {orderItemsResult.error ? <Message tone="error" text={`订单明细读取失败：${orderItemsResult.error}`} /> : null}
      {saved ? (
        <Message
          tone="success"
          text={cancelled ? "订单已标记为取消/退款，客户统计已刷新。" : "订单已更新，客户统计已刷新。"}
          detail={shippingWarning ? "已标记发货，建议补充物流方式、单号或发货日期，避免后续混淆。" : undefined}
        />
      ) : null}

      <form action={saveAction} className="max-w-none space-y-4">
        <FormSection title="基础信息">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <FormField label="订单日期" name="order_date" type="date" required defaultValue={order.order_date} />
            <FormField label="订单编号" name="order_no" required defaultValue={order.order_no} />
            <CustomerAutocompleteFields defaultCustomerName={order.customer_name} defaultContact={order.contact} defaultCountry={order.country} />
          </div>
        </FormSection>

        <FormSection title="产品与金额">
          <OrderItemsInput defaultItems={orderItemsResult.data} />
        </FormSection>

        <FormSection title="状态与备注">
          <div className="grid gap-3 md:grid-cols-3">
            <PaymentFields
              defaultPaymentStatus={order.payment_status}
              defaultDepositAmount={order.deposit_amount_rmb}
              defaultPaymentCurrency={order.payment_currency}
              defaultRmbPaymentMethod={order.rmb_payment_method}
              defaultPaymentRemark={order.payment_remark}
            />
            <label className="flex items-center gap-2 self-end rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <input
                name="is_refund_or_cancelled"
                type="checkbox"
                defaultChecked={order.is_refund_or_cancelled}
                className="h-4 w-4 rounded border-slate-300"
              />
              是否取消/退款
            </label>
          </div>
          <div className="mt-3">
            <FormField label="备注" name="remark" textarea rows={3} defaultValue={order.remark ?? ""} />
          </div>
        </FormSection>

        <FormSection title="发货信息" description="这里是避免重复发货和漏发货的关键字段。已发货但信息不完整时仍可保存，系统会给出提醒。">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SelectField label="发货状态" name="shipping_status" defaultValue={order.shipping_status ?? "未发货"} options={SHIPPING_STATUSES} />
            <SelectField label="物流方式" name="shipping_method" defaultValue={order.shipping_method ?? ""} options={SHIPPING_METHODS} emptyLabel="未填写" />
            <FormField label="物流/快运公司" name="shipping_company" defaultValue={order.shipping_company ?? ""} />
            <FormField label="物流单号/货运单号" name="tracking_no" defaultValue={order.tracking_no ?? ""} />
            <FormField label="发货日期" name="shipping_date" type="date" defaultValue={order.shipping_date ?? ""} />
          </div>
          <div className="mt-3">
            <FormField label="发货备注" name="shipping_remark" textarea rows={3} defaultValue={order.shipping_remark ?? ""} />
          </div>
        </FormSection>

        <div className="sticky bottom-0 z-10 -mx-2 mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50/95 px-2 py-3 backdrop-blur">
          <Button href="/orders" variant="secondary">返回订单列表</Button>
          <Button type="submit">保存订单</Button>
        </div>
      </form>

      {!order.is_refund_or_cancelled ? (
        <form action={cancelAction} className="mt-5 max-w-none rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-900">安全处理：不物理删除订单，只标记为取消/退款并刷新客户统计。</p>
            <Button type="submit" variant="warning">标记为取消/退款</Button>
          </div>
        </form>
      ) : null}
    </AppShell>
  );
}

function Message({ tone, text, detail }: { tone: "success" | "error"; text: string; detail?: string }) {
  const className =
    tone === "success"
      ? "mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
      : "mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800";
  return (
    <div className={className}>
      <div>{text}</div>
      {detail ? <div className="mt-2 text-amber-800">{detail}</div> : null}
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  emptyLabel,
}: {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue?: string;
  emptyLabel?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm shadow-slate-200/40 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
      >
        {emptyLabel ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
