import { markOrderShipped } from "@/app/orders/actions";
import { Button, inputClassName, textareaClassName } from "@/components/ui";
import { SHIPPING_METHODS } from "@/lib/shipping";
import { todayString } from "@/lib/csv";

export function MarkShippedForm({ orderId, returnTo = "/orders?pendingShipping=1" }: { orderId: string; returnTo?: string }) {
  const action = markOrderShipped.bind(null, orderId);

  return (
    <details className="group relative">
      <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100">
        标记已发货
      </summary>
      <form action={action} className="mt-2 w-[300px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
        <input type="hidden" name="return_to" value={returnTo} />
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-700">
            物流方式
            <select name="shipping_method" className={`${inputClassName} mt-1 h-9 px-2`}>
              <option value="">未填写</option>
              {SHIPPING_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <SmallInput label="物流/快运公司" name="shipping_company" />
          <SmallInput label="物流单号/货运单号" name="tracking_no" />
          <SmallInput label="发货日期" name="shipping_date" type="date" defaultValue={todayString()} />
          <label className="block text-xs font-medium text-slate-700">
            发货备注
            <textarea name="shipping_remark" rows={2} className={`${textareaClassName} mt-1 px-2 py-1`} />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="submit" className="h-8 px-3">保存为已发货</Button>
        </div>
      </form>
    </details>
  );
}

function SmallInput({
  label,
  name,
  type = "text",
  defaultValue = "",
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} className={`${inputClassName} mt-1 h-9 px-2`} />
    </label>
  );
}
