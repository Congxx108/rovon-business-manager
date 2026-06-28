import { AppShell } from "@/components/app-shell";
import { FormField } from "@/components/form-field";
import { CustomerAutocompleteFields, OrderItemsInput, PaymentFields } from "@/components/order-form-controls";
import { PageHeader } from "@/components/page-header";
import { Button, FormSection } from "@/components/ui";
import { createOrder } from "@/app/orders/actions";
import { todayString } from "@/lib/csv";
import { SHIPPING_METHODS, SHIPPING_STATUSES } from "@/lib/shipping";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; shippingWarning?: string }>;
}) {
  const { error, saved, shippingWarning } = await searchParams;

  return (
    <AppShell>
      <PageHeader title="新增订单" description="订单保存后会自动刷新客户统计；取消/退款订单不计入销售、数量和复购统计。" />

      {error ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <div className="font-medium">保存成功，已刷新客户统计。</div>
          {shippingWarning ? (
            <div className="mt-2 text-amber-800">已标记发货，建议补充物流方式、单号或发货日期，避免后续混淆。</div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3">
            <Button href="/orders/new">继续录入下一单</Button>
            <Button href="/orders" variant="secondary">返回订单列表</Button>
          </div>
        </div>
      ) : null}

      <form action={createOrder} className="max-w-none space-y-4">
        <FormSection title="基础信息" description="客户名和联系方式至少填写一个，方便后续客户统计和跟进。">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <FormField label="订单日期" name="order_date" type="date" required defaultValue={todayString()} />
            <FormField label="订单编号" name="order_no" placeholder="不填则自动生成" />
            <CustomerAutocompleteFields />
          </div>
        </FormSection>

        <FormSection title="产品与金额">
          <OrderItemsInput />
        </FormSection>

        <FormSection title="状态与备注" description="取消/退款订单会保留记录，但不计入销售、数量和客户统计。">
          <div className="grid gap-3 md:grid-cols-3">
            <PaymentFields />
            <label className="flex items-center gap-2 self-end rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <input name="is_refund_or_cancelled" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
              是否取消/退款
            </label>
          </div>
          <div className="mt-3">
          <FormField label="备注" name="remark" textarea rows={3} />
          </div>
        </FormSection>

        <FormSection title="发货信息" description="订单默认未发货。已发货或部分发货时，建议填写物流方式、公司、单号或发货日期，避免重复发货或漏发。">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SelectField label="发货状态" name="shipping_status" defaultValue="未发货" options={SHIPPING_STATUSES} />
            <SelectField label="物流方式" name="shipping_method" options={SHIPPING_METHODS} emptyLabel="未填写" />
            <FormField label="物流/快运公司" name="shipping_company" placeholder="例如 安能 / 本地物流" />
            <FormField label="物流单号/货运单号" name="tracking_no" />
            <FormField label="发货日期" name="shipping_date" type="date" />
          </div>
          <div className="mt-3">
            <FormField label="发货备注" name="shipping_remark" textarea rows={3} placeholder="例如 发了几件、分几批、货站信息、本地物流联系人" />
          </div>
        </FormSection>

        <div className="sticky bottom-0 z-10 -mx-2 mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50/95 px-2 py-3 backdrop-blur">
          <Button href="/orders" variant="secondary">返回订单列表</Button>
          <Button type="submit" name="after_save" value="orders">保存订单</Button>
          <Button type="submit" name="after_save" value="new">保存并继续新增</Button>
        </div>
      </form>
    </AppShell>
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
