"use client";

import { useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { markOrderShipped } from "@/app/orders/actions";
import { Button, inputClassName, textareaClassName } from "@/components/ui";
import { todayString } from "@/lib/csv";
import { formatNumber, formatRmb } from "@/lib/format";
import { SHIPPING_METHODS } from "@/lib/shipping";

type MarkShippedFormProps = {
  orderId: string;
  returnTo?: string;
  orderNo?: string | null;
  customerName?: string | null;
  country?: string | null;
  quantity?: number | null;
  salesAmountRmb?: number | null;
};

export function MarkShippedForm({
  orderId,
  returnTo = "/orders?pendingShipping=1",
  orderNo,
  customerName,
  country,
  quantity,
  salesAmountRmb,
}: MarkShippedFormProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const action = markOrderShipped.bind(null, orderId);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 active:translate-y-px"
      >
        标记已发货
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/30 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/20"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-950">
                  标记订单为已发货
                </h2>
                <p className="mt-1 text-sm text-slate-500">本地物流没有标准单号时可以留空。</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-2 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                关闭
              </button>
            </div>

            <OrderSummary orderNo={orderNo} customerName={customerName} country={country} quantity={quantity} salesAmountRmb={salesAmountRmb} />

            <form action={action} className="mt-5 space-y-4">
              <input type="hidden" name="return_to" value={returnTo} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  物流方式
                  <select name="shipping_method" className={inputClassName}>
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
              </div>
              <label className="block text-sm font-medium text-slate-700">
                发货备注
                <textarea name="shipping_remark" rows={3} className={textareaClassName} />
              </label>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  取消
                </Button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function OrderSummary({
  orderNo,
  customerName,
  country,
  quantity,
  salesAmountRmb,
}: Pick<MarkShippedFormProps, "orderNo" | "customerName" | "country" | "quantity" | "salesAmountRmb">) {
  return (
    <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm sm:grid-cols-2">
      <SummaryLine label="订单编号" value={orderNo || "-"} />
      <SummaryLine label="客户名" value={customerName || "-"} />
      <SummaryLine label="国家/渠道" value={country || "-"} />
      <SummaryLine label="数量" value={quantity === null || quantity === undefined ? "-" : formatNumber(quantity)} />
      <SummaryLine label="销售额RMB" value={salesAmountRmb === null || salesAmountRmb === undefined ? "-" : formatRmb(salesAmountRmb)} />
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 truncate font-semibold text-slate-900" title={value}>
        {value}
      </div>
    </div>
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
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} className={inputClassName} />
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "保存中..." : "保存为已发货"}
    </Button>
  );
}
