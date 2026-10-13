"use client";

import { useEffect, useRef, useState } from "react";
import { getOrderNumberPreviewAction } from "@/app/orders/number-preview-action";
import type { OrderNumberPreview } from "@/lib/order-number-preview";
import { inputClassName, labelClassName } from "@/components/ui";

export function OrderNumberFields({ initialDate, initialPreview }: { initialDate: string; initialPreview: OrderNumberPreview }) {
  const [orderDate, setOrderDate] = useState(initialDate);
  const [manualNumber, setManualNumber] = useState<string | null>(null);
  const [preview, setPreview] = useState({ ...initialPreview, date: initialDate });
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!orderDate) return;
    let cancelled = false;
    getOrderNumberPreviewAction(orderDate).then((result) => {
      if (!cancelled) setPreview({ ...result, date: orderDate });
    }).catch(() => {
      if (!cancelled) setPreview({ orderNo: null, error: "暂时无法预览，保存时仍会自动编号", date: orderDate });
    });
    return () => { cancelled = true; };
  }, [orderDate]);

  const isCurrent = preview.date === orderDate;
  const number = manualNumber ?? (isCurrent ? preview.orderNo ?? "" : "");
  const hint = manualNumber !== null ? "手填编号；清空恢复自动编号" : !orderDate ? "请先填写订单日期" : !isCurrent ? "正在预览编号…" : preview.error ?? "预计编号，保存时确定；可手动修改";

  return (
    <>
      <label className={labelClassName}>
        <span>订单日期<span className="ml-1 text-rose-600">*</span></span>
        <input name="order_date" type="date" required value={orderDate} onChange={(event) => setOrderDate(event.target.value)} className={inputClassName} />
      </label>
      <label className={labelClassName}>
        <span>订单编号</span>
        <input value={number} onChange={(event) => setManualNumber(event.target.value.trim() ? event.target.value : null)} placeholder="保存时自动编号" aria-describedby="order-number-hint" className={inputClassName} />
        <span id="order-number-hint" className="text-xs font-normal leading-5 text-slate-500" aria-live="polite">{hint}</span>
      </label>
      {/* A displayed estimate is not a manual number; automatic saves stay atomic. */}
      <input type="hidden" name="order_no" value={manualNumber ?? ""} />
    </>
  );
}
