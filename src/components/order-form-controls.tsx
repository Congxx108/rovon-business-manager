"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchOrderCustomers, type OrderCustomerSuggestion } from "@/app/orders/actions";
import { Button, inputClassName, labelClassName, tableHeadClassName, tableRowClassName, textareaClassName } from "@/components/ui";
import { detectCountryFromContact } from "@/lib/country-detection";
import { formatDate, formatNumber, formatRmb } from "@/lib/format";
import { PAYMENT_CURRENCIES, RMB_PAYMENT_METHODS, suggestPaymentCurrency } from "@/lib/payment";
import type { OrderItem } from "@/lib/types";

const productLineOptions = ["女包", "书包", "男包", "混合", "其他"];

type OrderItemDraft = Pick<OrderItem, "id" | "product_line" | "quantity" | "sales_amount_rmb">;

export function CustomerAutocompleteFields({
  defaultCustomerName = "",
  defaultContact = "",
  defaultCountry = "",
}: {
  defaultCustomerName?: string | null;
  defaultContact?: string | null;
  defaultCountry?: string | null;
}) {
  const [customerName, setCustomerName] = useState(defaultCustomerName ?? "");
  const [contact, setContact] = useState(defaultContact ?? "");
  const initialDetectedCountry = detectCountryFromContact(defaultContact);
  const [country, setCountry] = useState(defaultCountry || initialDetectedCountry || "");
  const [lastDetected, setLastDetected] = useState<string | null>(initialDetectedCountry);
  const [countryTouched, setCountryTouched] = useState(Boolean(defaultCountry));
  const [suggestions, setSuggestions] = useState<OrderCustomerSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeField, setActiveField] = useState<"name" | "contact" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const detected = detectCountryFromContact(contact);
  const activeSearchText = activeField === "contact" ? contact.trim() : activeField === "name" ? customerName.trim() : "";
  const searchText = activeSearchText || (contact.trim().length >= 2 ? contact.trim() : customerName.trim());
  const visibleSuggestions = open && searchText.length >= 2 ? suggestions : [];

  useEffect(() => {
    if (searchText.length < 2) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchOrderCustomers(searchText).then((results) => {
        if (!cancelled) {
          setSuggestions(results);
          setOpen(true);
        }
      });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchText]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveField(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveField(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function updateCountry(nextCountry: string, touched: boolean) {
    setCountry(nextCountry);
    setCountryTouched(touched);
    window.dispatchEvent(new CustomEvent("rovon-country-change", { detail: nextCountry }));
  }

  function chooseCustomer(customer: OrderCustomerSuggestion) {
    setCustomerName(customer.name);
    setContact(customer.contact ?? "");
    updateCountry(customer.country ?? "", true);
    setOpen(false);
    setActiveField(null);
  }

  return (
    <div ref={rootRef} className="contents">
      <div className="relative">
        <label className={labelClassName}>
          客户名
          <input
            name="customer_name"
            value={customerName}
            onFocus={() => {
              setActiveField("name");
              if (customerName.trim().length >= 2) setOpen(true);
            }}
            onChange={(event) => {
              const nextName = event.target.value;
              setCustomerName(nextName);
              setActiveField("name");
              setOpen(nextName.trim().length >= 2);
            }}
            placeholder="输入客户名可匹配老客户"
            className={inputClassName}
          />
        </label>
        {activeField === "name" ? <CustomerDropdown customers={visibleSuggestions} onChoose={chooseCustomer} /> : null}
      </div>
      <div className="relative">
        <label className={labelClassName}>
          联系方式 / WhatsApp
          <input
            name="contact"
            value={contact}
            onFocus={() => {
              setActiveField("contact");
              if (contact.trim().length >= 2) setOpen(true);
            }}
            onChange={(event) => {
              const nextContact = event.target.value;
              const nextDetected = detectCountryFromContact(nextContact);
              setContact(nextContact);
              setActiveField("contact");
              setOpen(nextContact.trim().length >= 2);
              if (nextDetected && (!countryTouched || !country || country === lastDetected)) {
                updateCountry(nextDetected, false);
                setLastDetected(nextDetected);
              }
            }}
            placeholder="输入 WhatsApp 可匹配老客户"
            className={inputClassName}
          />
        </label>
        {activeField === "contact" ? <CustomerDropdown customers={visibleSuggestions} onChoose={chooseCustomer} /> : null}
      </div>
      <label className={labelClassName}>
        国家/渠道<span className="ml-1 text-rose-600">*</span>
        <input
          name="country"
          required
          value={country}
          onChange={(event) => updateCountry(event.target.value, true)}
          placeholder="例如 加纳 / 微信订单"
          className={inputClassName}
        />
        {detected ? <span className="mt-1 block text-xs text-slate-500">已根据联系方式识别：{detected}，可手动修改。</span> : null}
      </label>
    </div>
  );
}

function CustomerDropdown({
  customers,
  onChoose,
}: {
  customers: OrderCustomerSuggestion[];
  onChoose: (customer: OrderCustomerSuggestion) => void;
}) {
  if (!customers.length) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/12">
      {customers.map((customer) => (
        <button
          key={customer.id}
          type="button"
          onClick={() => onChoose(customer)}
          className="block w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-blue-50/70"
        >
          <div className="flex min-w-0 items-center gap-2 font-semibold text-slate-950">
            <span className="truncate">{customer.name}</span>
            <span className="shrink-0 text-xs font-medium text-slate-500">{customer.country ?? "-"}</span>
          </div>
          <div className="mt-1 truncate text-xs text-slate-500">{customer.contact ?? "-"}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>最近下单 {formatDate(customer.last_order_date)}</span>
            <span>历史订单 {formatNumber(customer.total_orders)}</span>
            <span>历史销售 {formatRmb(Number(customer.total_sales_rmb ?? 0))}</span>
          </div>
        </button>
      ))}
    </div>
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
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
        <table className="w-full min-w-[760px] table-fixed text-left text-sm">
          <thead className={tableHeadClassName}>
            <tr>
              <th className="w-[220px] px-3 py-2 font-medium">产品类目</th>
              <th className="w-[140px] px-3 py-2 text-right font-medium">数量</th>
              <th className="w-[180px] px-3 py-2 text-right font-medium">销售额 RMB</th>
              <th className="w-[120px] px-3 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.id}-${index}`} className={tableRowClassName}>
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
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
          <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">总数量：{totals.quantity.toLocaleString()}</span>
          <span className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 font-semibold text-blue-800">
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
  defaultPaymentCurrency = "",
  defaultRmbPaymentMethod = "",
  defaultPaymentRemark = "",
}: {
  defaultPaymentStatus?: string | null;
  defaultDepositAmount?: number | null;
  defaultPaymentCurrency?: string | null;
  defaultRmbPaymentMethod?: string | null;
  defaultPaymentRemark?: string | null;
}) {
  const normalizedStatus = defaultPaymentStatus === "定金" ? "定金" : "已付全款";
  const [paymentStatus, setPaymentStatus] = useState(normalizedStatus);
  const [paymentCurrency, setPaymentCurrency] = useState(defaultPaymentCurrency ?? "");
  const [currencyTouched, setCurrencyTouched] = useState(Boolean(defaultPaymentCurrency));

  useEffect(() => {
    function handleCountryChange(event: Event) {
      const country = (event as CustomEvent<string>).detail;
      const suggested = suggestPaymentCurrency(country);
      if (suggested && !currencyTouched) setPaymentCurrency(suggested);
    }

    window.addEventListener("rovon-country-change", handleCountryChange);
    return () => window.removeEventListener("rovon-country-change", handleCountryChange);
  }, [currencyTouched]);

  return (
    <>
      <label className={labelClassName}>
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
        <label className={`${labelClassName} polish-fade-in`}>
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
      <label className={labelClassName}>
        客户支付货币
        <select
          name="payment_currency"
          value={paymentCurrency}
          onChange={(event) => {
            setPaymentCurrency(event.target.value);
            setCurrencyTouched(true);
          }}
          className={inputClassName}
        >
          <option value="">未填写</option>
          {PAYMENT_CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </label>
      {paymentCurrency === "RMB" ? (
        <label className={`${labelClassName} polish-fade-in`}>
          人民币收款方式
          <select name="rmb_payment_method" defaultValue={defaultRmbPaymentMethod ?? ""} className={inputClassName}>
            <option value="">未填写</option>
            {RMB_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="rmb_payment_method" value="" />
      )}
      <label className={`${labelClassName} md:col-span-2 xl:col-span-3`}>
        付款备注
        <textarea name="payment_remark" defaultValue={defaultPaymentRemark ?? ""} rows={2} className={textareaClassName} />
      </label>
    </>
  );
}
