import { AppShell } from "@/components/app-shell";
import { FormField } from "@/components/form-field";
import { CustomerAutocompleteFields, OrderItemsInput, PaymentFields } from "@/components/order-form-controls";
import { PageHeader } from "@/components/page-header";
import { Button, FormSection } from "@/components/ui";
import { createOrder } from "@/app/orders/actions";
import { todayString } from "@/lib/csv";

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

      <form action={createOrder} className="max-w-none space-y-5">
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
            <label className="flex h-10 items-center gap-2 self-end rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
              <input name="is_refund_or_cancelled" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
              是否取消/退款
            </label>
          </div>
          <div className="mt-3">
          <FormField label="备注" name="remark" textarea rows={3} />
          </div>
        </FormSection>

        <div className="sticky bottom-0 z-10 -mx-2 mt-6 flex flex-wrap justify-end gap-3 rounded-t-2xl border border-slate-200 bg-white/92 px-3 py-3 shadow-lg shadow-slate-900/5 backdrop-blur">
          <Button href="/orders" variant="secondary">返回订单列表</Button>
          <Button type="submit" name="after_save" value="orders">保存订单</Button>
          <Button type="submit" name="after_save" value="new">保存并继续新增</Button>
        </div>
      </form>
    </AppShell>
  );
}
