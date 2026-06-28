"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { detectCountryFromContact } from "@/lib/country-detection";
import type { OrderItem } from "@/lib/types";

const productLineOptions = ["女包", "书包", "男包", "混合", "其他"];

type OrderItemDraft = Pick<OrderItem, "id" | "product_line" | "quantity" | "sales_amount_rmb">;

export function ContactCountryFields({
  defaultContact = "",
  defaultCountry = "",
}: {
  defaultContact?: string | null;
  defaultCountry?: string | null;
}) {
  const [contact, setContact] = useState(defaultContact ?? "");
  const initialDetectedCountry = detectCountryFromContact(defaultContact);
  const [country, setCountry] = useState(defaultCountry || initialDetectedCountry || "");
  const [lastDetected, setLastDetected] = useState<string | null>(null);
  const [countryTouched, setCountryTouched] = useState(Boolean(defaultCountry));
  const detected = detectCountryFromContact(contact);

  return (
    <>
      <label className="block text-sm font-medium text-slate-700">
        联系方式 / WhatsApp
        <input
          name="contact"
          value={contact}
          onChange={(event) => {
            const nextContact = event.target.value;
            const nextDetected = detectCountryFromContact(nextContact);
            setContact(nextContact);
            if (nextDetected && (!countryTouched || !country || country === lastDetected)) {
              setCountry(nextDetected);
              setLastDetected(nextDetected);
              setCountryTouched(false);
            }
          }}
          className={inputClassName}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        国家/渠道<span className="ml-1 text-rose-600">*</span>
        <input
          name="country"
          required
          value={country}
          onChange={(event) => {
            setCountry(event.target.value);
            setCountryTouched(true);
          }}
          placeholder="例如 加纳 / 微信订单"
          className={inputClassName}
        />
        {detected ? <span className="mt-1 block text-xs text-slate-500">已根据联系方式识别：{detected}，可手动修改。</span> : null}
      </label>
    </>
  );
}

export function OrderItemsInput({ defaultItems }: { defaultItems?: OrderItemDraft[] }) {
  const [items, setItems] = useState<OrderItemDraft[]>(
    defaultItems?.length
      ? defaultItems
      : [{ id: "", product_line: "女包", quantity: 0, sales_amount_rmb: 0 }],
  );
  const totals = useMemo(
    () => ({
      quantity: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      sales: items.reduce((sum, item) => sum + Number(item.sales_amount_rmb || 0), 0),
    }),
    [items],
  );

  function updateItem(index: number, patch: Partial<OrderItemDraft>) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItems((current) => (current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current));
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[760px] table-fixed text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 [&_th]:whitespace-nowrap">
            <tr>
              <th className="w-[220px] px-3 py-2 font-medium">产品类目</th>
              <th className="w-[140px] px-3 py-2 text-right font-medium">数量</th>
              <th className="w-[180px] px-3 py-2 text-right font-medium">销售额 RMB</th>
              <th className="w-[120px] px-3 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.id}-${index}`} className="border-b border-slate-100">
                <td className="px-3 py-2">
                  <input type="hidden" name="item_id" value={item.id} />
                  <select
                    name="item_product_line"
                    value={item.product_line}
                    onChange={(event) => updateItem(index, { product_line: event.target.value })}
                    className={inputClassName}
                  >
                    {productLineOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    name="item_quantity"
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })}
                    className={`${inputClassName} text-right`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    name="item_sales_amount_rmb"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.sales_amount_rmb}
                    onChange={(event) => updateItem(index, { sales_amount_rmb: Number(event.target.value) })}
                    className={`${inputClassName} text-right`}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="h-9 rounded-md border border-slate-300 px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setItems((current) => [...current, { id: "", product_line: "女包", quantity: 0, sales_amount_rmb: 0 }])}
        >
          添加产品类目
        </Button>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-md bg-slate-100 px-3 py-2 font-medium text-slate-700">总数量：{totals.quantity.toLocaleString()}</span>
          <span className="rounded-md bg-slate-100 px-3 py-2 font-medium text-slate-700">
            总销售额：¥{totals.sales.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PaymentFields({
  defaultPaymentStatus = "已付全款",
  defaultDepositAmount = 0,
}: {
  defaultPaymentStatus?: string | null;
  defaultDepositAmount?: number | null;
}) {
  const normalizedStatus = defaultPaymentStatus === "定金" ? "定金" : "已付全款";
  const [paymentStatus, setPaymentStatus] = useState(normalizedStatus);

  return (
    <>
      <label className="block text-sm font-medium text-slate-700">
        付款状态
        <select
          name="payment_status"
          value={paymentStatus}
          onChange={(event) => setPaymentStatus(event.target.value)}
          className={inputClassName}
        >
          <option value="已付全款">已付全款</option>
          <option value="定金">定金</option>
        </select>
      </label>
      {paymentStatus === "定金" ? (
        <label className="block text-sm font-medium text-slate-700">
          定金金额 RMB
          <input
            name="deposit_amount_rmb"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaultDepositAmount ?? 0}
            className={inputClassName}
          />
        </label>
      ) : (
        <input type="hidden" name="deposit_amount_rmb" value="0" />
      )}
    </>
  );
}

const inputClassName =
  "mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm shadow-slate-200/40 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10";
