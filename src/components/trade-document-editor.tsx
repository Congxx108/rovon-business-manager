"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  inputClassName as baseInputClassName,
  textareaClassName as baseTextareaClassName,
} from "@/components/ui";
import {
  TRADE_SELECT_OPTIONS,
  emptyGroup,
  emptyItem,
  localDate,
  totals,
  type DocumentType,
  type Seller,
  type TradeData,
  type TradeDocument,
  type TradeSettings,
  type TradeVersion,
} from "@/lib/trade-documents/model";
type OrderOption = { id: string; order_no: string; customer_name: string };
const inputClassName = `${baseInputClassName} mt-1! h-9! min-w-0`;
const textareaClassName = `${baseTextareaClassName} mt-1! min-w-0 py-1.5!`;
const labelClassName = "block min-w-0 text-xs font-medium text-slate-700";
function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-sm sm:p-4">
      <div className="mb-2 border-b border-slate-100 pb-2">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  wide = false,
  readOnly = false,
  className = "",
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  wide?: boolean;
  readOnly?: boolean;
  className?: string;
  rows?: number;
}) {
  return (
    <label className={`${labelClassName} ${className}`}>
      {label}
      {wide ? (
        <textarea
          aria-label={label}
          className={textareaClassName}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
        />
      ) : (
        <input
          aria-label={label}
          className={inputClassName}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          step={type === "number" ? "any" : undefined}
          min={type === "number" ? "0" : undefined}
        />
      )}
    </label>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  const [custom, setCustom] = useState(!!value && !options.includes(value));
  return (
    <label className={labelClassName}>
      {label}
      <select
        aria-label={label}
        className={inputClassName}
        value={custom ? "__custom__" : value}
        onChange={(e) => {
          const next = e.target.value;
          setCustom(next === "__custom__");
          onChange(next === "__custom__" ? "" : next);
        }}
      >
        <option value="">请选择</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value="__custom__">其他（手动填写）</option>
      </select>
      {custom && (
        <input
          aria-label={`自定义${label}`}
          className={inputClassName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
async function api(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || "操作失败");
  return json;
}
async function compressImage(file: File) {
  if (!["image/jpeg", "image/png"].includes(file.type))
    throw new Error("请上传 PNG 或 JPEG 图片");
  if (file.size > 20000000) throw new Error("原图片最大 20 MB，请先压缩");
  const bitmap = await createImageBitmap(file),
    canvas = document.createElement("canvas"),
    ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("图片处理失败");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.86),
  );
  if (!blob || blob.size > 2000000)
    throw new Error("压缩后图片仍超过 2 MB，请换用较小图片");
  return blob;
}
export function TradeDocumentEditor({
  initial,
  initialData,
  type,
  settings,
  orders,
  versions = [],
  sourceId = null,
  initialOrderId = "",
}: {
  initial?: TradeDocument;
  initialData: TradeData;
  type: DocumentType;
  settings: TradeSettings;
  orders: OrderOption[];
  versions?: TradeVersion[];
  sourceId?: string | null;
  initialOrderId?: string;
}) {
  const router = useRouter(),
    [saved, setSaved] = useState(initial),
    [data, setData] = useState(initialData),
    [no, setNo] = useState(initial?.document_no ?? ""),
    [date, setDate] = useState(initial?.document_date ?? localDate()),
    [orderId, setOrderId] = useState(initial?.order_id ?? initialOrderId),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(
      initial
        ? `/api/trade-documents/${initial.id}/pdf?revision=${initial.revision}`
        : "",
    ),
    [dirty, setDirty] = useState(!initial),
    [bankOpen, setBankOpen] = useState(
      !initialData.bank_profile_id || !!initialData.bank_override,
    );
  const locked = saved?.status === "void",
    disabled = !!busy || locked;
  function change(next: TradeData) {
    setData(next);
    setDirty(true);
  }
  function patch<K extends keyof TradeData>(key: K, value: TradeData[K]) {
    change({ ...data, [key]: value });
  }
  function party(key: "buyer" | "seller", field: keyof Seller, value: string) {
    patch(key, { ...data[key], [field]: value });
  }
  function updateItem(
    index: number,
    key: keyof TradeData["items"][number],
    value: string,
  ) {
    patch(
      "items",
      data.items.map((x, i) => (i === index ? { ...x, [key]: value } : x)),
    );
  }
  function updateGroup(
    index: number,
    key: keyof TradeData["packing_groups"][number],
    value: string,
  ) {
    patch(
      "packing_groups",
      data.packing_groups.map((x, i) =>
        i === index ? { ...x, [key]: value } : x,
      ),
    );
  }
  function selectBank(id: string, currency = data.currency) {
    const bank = settings.banks.find((b) => b.id === id);
    setBankOpen(!bank);
    change({
      ...data,
      currency,
      bank_profile_id: bank?.id ?? "",
      bank: bank
        ? {
            bank_name: bank.bank_name,
            account_name: bank.account_name,
            account_no: bank.account_no,
            swift: bank.swift,
            address: bank.address,
            remark: bank.remark,
          }
        : {
            bank_name: "",
            account_name: "",
            account_no: "",
            swift: "",
            address: "",
            remark: "",
          },
      bank_override: "",
    });
  }
  async function save() {
    const json = await api("/api/trade-documents", {
      id: saved?.id,
      revision: saved?.revision ?? 0,
      document_type: type,
      document_no: no,
      document_date: date,
      order_id: orderId || null,
      source_document_id: sourceId,
      data,
    });
    const doc = json.document as TradeDocument;
    setSaved(doc);
    setData(doc.data);
    setNo(doc.document_no);
    setDirty(false);
    setPreview(`/api/trade-documents/${doc.id}/pdf?revision=${doc.revision}`);
    if (!saved) router.replace(`/trade-documents/${doc.id}`);
    return doc;
  }
  async function run(action: "save" | "preview" | "issue" | "void") {
    setBusy(action);
    setMessage("");
    setError("");
    try {
      if (action === "void") {
        if (
          !saved ||
          !window.confirm(
            "作废这份单据？已出具的 PDF 和历史版本会保留，订单不受影响。",
          )
        )
          return;
        const json = await api(`/api/trade-documents/${saved.id}/void`, {
          revision: saved.revision,
        });
        setSaved(json.document);
        setMessage("单据已作废，历史版本已保留");
        router.refresh();
        return;
      }
      const doc = !dirty && saved ? saved : await save();
      if (action === "issue") {
        const json = await api(`/api/trade-documents/${doc.id}/issue`, {
          revision: doc.revision,
        });
        setSaved(json.document);
        setPreview(
          `/api/trade-documents/${doc.id}/pdf?version=${json.document.current_version}`,
        );
        setMessage(
          `已确认出具第 ${json.document.current_version} 版，历史 PDF 已固定保存`,
        );
        router.refresh();
      } else {
        setPreview(
          `/api/trade-documents/${doc.id}/pdf?revision=${doc.revision}`,
        );
        setMessage(
          action === "preview" ? "已保存，正在载入 PDF 预览" : "单据已保存",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy("");
    }
  }
  async function upload(file: File, index: number) {
    setBusy("upload");
    setError("");
    try {
      const blob = await compressImage(file),
        form = new FormData();
      form.append("file", blob, "product.jpg");
      const r = await fetch("/api/trade-documents/assets", {
          method: "POST",
          body: form,
        }),
        json = await r.json();
      if (!r.ok) throw new Error(json.error);
      updateItem(index, "image_path", json.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "图片上传失败");
    } finally {
      setBusy("");
    }
  }
  let total: ReturnType<typeof totals> | null = null;
  try {
    total = totals(data);
  } catch {
    /* Allow incomplete numeric text while typing; server validates on save. */
  }
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm leading-5 text-blue-900">
        客户需要时才制作。单据可以不关联订单，PI
        未成单可保留；保存、出具或作废均不改变订单与经营统计。
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}
      {saved && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span>
            {saved.status === "draft"
              ? "草稿"
              : saved.status === "issued"
                ? "已出具"
                : "已作废"}{" "}
            · 已出具 {saved.current_version} 版
          </span>
          {(["pi", "ci", "packing"] as DocumentType[]).map((t) => (
            <Link
              key={t}
              className="text-blue-700 hover:underline"
              href={`/trade-documents/new?copy=${saved.id}&type=${t}`}
            >
              复制为 {t === "packing" ? "装箱单" : t.toUpperCase()}
            </Link>
          ))}
        </div>
      )}
      <fieldset disabled={disabled} className="space-y-3 disabled:opacity-80">
        <FormSection
          title="单据与关联"
          description="编号留空自动生成。关联订单只建立关系，不会覆盖单据内容。"
        >
          <div
            className={`grid gap-2 sm:grid-cols-2 ${type === "pi" ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}
          >
            <Field
              label="单据编号"
              value={no}
              onChange={(v) => {
                setNo(v);
                setDirty(true);
              }}
            />
            <Field
              label="单据日期"
              type="date"
              value={date}
              onChange={(v) => {
                setDate(v);
                setDirty(true);
              }}
            />
            <label className={labelClassName}>
              关联订单（可选）
              <select
                aria-label="关联订单（可选）"
                className={inputClassName}
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  setDirty(true);
                }}
              >
                <option value="">不关联订单</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_no} · {o.customer_name}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="出货批次 / 内部标识（可选）"
              value={data.shipment_label}
              onChange={(v) => patch("shipment_label", v)}
            />
            {type === "pi" && (
              <Field
                label="有效期（可选）"
                type="date"
                value={data.valid_until}
                onChange={(v) => patch("valid_until", v)}
              />
            )}
          </div>
        </FormSection>
        <div className="grid gap-3 xl:grid-cols-2">
          {(["buyer", "seller"] as const).map((key) => (
            <FormSection
              key={key}
              title={key === "buyer" ? "买方资料" : "卖方资料"}
              description={
                key === "seller"
                  ? "本单保存独立副本，设置更新不会修改历史单据。"
                  : undefined
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <Field
                  className="col-span-2"
                  label="公司 / 名称"
                  value={data[key].name}
                  onChange={(v) => party(key, "name", v)}
                />
                <Field
                  label="联系人"
                  value={data[key].contact}
                  onChange={(v) => party(key, "contact", v)}
                />
                <Field
                  label="联系方式"
                  value={data[key].phone}
                  onChange={(v) => party(key, "phone", v)}
                />
                <Field
                  label="详细地址（含国家）"
                  value={data[key].address}
                  onChange={(v) => party(key, "address", v)}
                  className="col-span-2"
                  wide
                />
              </div>
            </FormSection>
          ))}
        </div>
        <FormSection title="交易与运输">
          <div
            className={`grid gap-2 sm:grid-cols-2 ${type === "packing" ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}
          >
            <SelectField
              label="贸易条款"
              options={TRADE_SELECT_OPTIONS.incoterms}
              value={data.incoterm}
              onChange={(v) => patch("incoterm", v)}
            />
            {type !== "packing" ? (
              <>
                <Field
                  label="FOB 城市"
                  value={data.fob_city}
                  onChange={(v) => patch("fob_city", v)}
                />
                <label className={labelClassName}>
                  单据币种
                  <select
                    aria-label="单据币种"
                    className={inputClassName}
                    value={data.currency}
                    onChange={(e) => {
                      const currency = e.target.value,
                        bank = settings.banks.find(
                          (b) => b.currency === currency,
                        );
                      selectBank(bank?.id ?? "", currency);
                    }}
                  >
                    {[...new Set([...settings.currencies, data.currency])].map(
                      (c) => (
                        <option key={c}>{c}</option>
                      ),
                    )}
                  </select>
                </label>
                <SelectField
                  label="付款条款"
                  options={TRADE_SELECT_OPTIONS.payment_terms}
                  value={data.payment_terms}
                  onChange={(v) => patch("payment_terms", v)}
                />
                <SelectField
                  label="付款方式"
                  options={TRADE_SELECT_OPTIONS.payment_methods}
                  value={data.payment_method}
                  onChange={(v) => patch("payment_method", v)}
                />
                <Field
                  label="费用名称"
                  value={data.fee_label}
                  onChange={(v) => patch("fee_label", v)}
                />
                <Field
                  label={`费用金额（${data.currency}）`}
                  type="number"
                  value={data.fee}
                  onChange={(v) => patch("fee", v)}
                />
              </>
            ) : (
              <>
                <Field
                  label="关联发票编号（可选）"
                  value={data.invoice_reference}
                  onChange={(v) => patch("invoice_reference", v)}
                />
                <Field
                  label="运输方式"
                  value={data.delivery}
                  onChange={(v) => patch("delivery", v)}
                />
                <Field
                  label="起运地"
                  value={data.departure}
                  onChange={(v) => patch("departure", v)}
                />
                <Field
                  label="目的地"
                  value={data.destination}
                  onChange={(v) => patch("destination", v)}
                />
              </>
            )}
          </div>
        </FormSection>
        <FormSection
          title="商品明细"
          description={
            type === "packing"
              ? "混箱商品可选择同一装箱组，箱数、重量和体积只计算一次。"
              : "成交单价按本单填写；从订单带入的资料需要补充英文描述、规格与单价。"
          }
        >
          <div className="space-y-4">
            {data.items.map((item, i) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">商品 {i + 1}</h3>
                  <Button
                    variant="ghost"
                    disabled={data.items.length === 1}
                    onClick={() =>
                      patch(
                        "items",
                        data.items.filter((_, j) => j !== i),
                      )
                    }
                  >
                    移除
                  </Button>
                </div>
                {type !== "packing" ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_auto]">
                    <Field
                      label="英文描述"
                      value={item.description}
                      onChange={(v) => updateItem(i, "description", v)}
                      wide
                      className="sm:col-span-2 xl:col-span-1"
                    />
                    <Field
                      label="规格 / 型号"
                      value={item.model}
                      onChange={(v) => updateItem(i, "model", v)}
                      className="sm:col-span-2 xl:col-span-1"
                    />
                    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1.2fr)] gap-2 sm:col-span-2 xl:col-span-1 xl:w-[21rem]">
                      <Field
                        label="单位"
                        value={item.unit}
                        onChange={(v) => updateItem(i, "unit", v)}
                      />
                      <Field
                        label="数量（件）"
                        type="number"
                        value={item.quantity}
                        onChange={(v) => updateItem(i, "quantity", v)}
                      />
                      <Field
                        label={`成交单价（${data.currency}）`}
                        type="number"
                        value={item.unit_price}
                        onChange={(v) => updateItem(i, "unit_price", v)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-12">
                    <Field
                      label="英文描述"
                      value={item.description}
                      onChange={(v) => updateItem(i, "description", v)}
                      wide
                      className="col-span-2 xl:col-span-4"
                    />
                    <Field
                      label="中文品名"
                      value={item.chinese_name}
                      onChange={(v) => updateItem(i, "chinese_name", v)}
                      className="xl:col-span-2"
                    />
                    <Field
                      label="材质"
                      value={item.material}
                      onChange={(v) => updateItem(i, "material", v)}
                      className="xl:col-span-2"
                    />
                    <Field
                      label="HS Code"
                      value={item.hs_code}
                      onChange={(v) => updateItem(i, "hs_code", v)}
                      className="xl:col-span-2"
                    />
                    <Field
                      label="数量（件）"
                      type="number"
                      value={item.quantity}
                      onChange={(v) => updateItem(i, "quantity", v)}
                      className="xl:col-span-2"
                    />
                    <Field
                      label="品牌信息"
                      value={item.brand}
                      onChange={(v) => updateItem(i, "brand", v)}
                      className="xl:col-span-2"
                    />
                    <Field
                      label="电池信息"
                      value={item.battery}
                      onChange={(v) => updateItem(i, "battery", v)}
                      className="xl:col-span-2"
                    />
                    <label
                      className={`${labelClassName} col-span-2 xl:col-span-8`}
                    >
                      装箱组
                      <select
                        aria-label="装箱组"
                        className={inputClassName}
                        value={item.packing_group}
                        onChange={(e) =>
                          updateItem(i, "packing_group", e.target.value)
                        }
                      >
                        <option value="">请选择</option>
                        {data.packing_groups.map((g, j) => (
                          <option key={g.id} value={g.id}>
                            {g.label || `装箱组 ${j + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-sm text-slate-600">
                    商品图片
                    <input
                      aria-label={`商品 ${i + 1} 图片`}
                      className="ml-2 max-w-[220px] text-xs"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void upload(file, i);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {item.image_path && (
                    <>
                      <a
                        className="text-sm text-blue-700"
                        target="_blank"
                        rel="noreferrer"
                        href={`/api/trade-documents/assets?path=${encodeURIComponent(item.image_path)}`}
                      >
                        查看图片
                      </a>
                      <Button
                        variant="ghost"
                        onClick={() => updateItem(i, "image_path", "")}
                      >
                        清除图片
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button
            className="mt-4"
            variant="secondary"
            disabled={data.items.length >= 100}
            onClick={() =>
              patch("items", [...data.items, emptyItem(crypto.randomUUID())])
            }
          >
            添加商品
          </Button>
        </FormSection>
        {type === "packing" && (
          <FormSection
            title="实际装箱资料"
            description="重量填单箱 kg，外箱长宽高填 cm。不同箱规建立不同组；混箱共用同一组。"
          >
            <div className="space-y-4">
              {data.packing_groups.map((g, i) => (
                <div
                  key={g.id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <div className="mb-3 flex justify-between">
                    <span className="text-sm font-semibold">
                      装箱组 {i + 1}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        change({
                          ...data,
                          packing_groups: data.packing_groups.filter(
                            (_, j) => i !== j,
                          ),
                          items: data.items.map((x) =>
                            x.packing_group === g.id
                              ? { ...x, packing_group: "" }
                              : x,
                          ),
                        })
                      }
                    >
                      移除
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
                    {(
                      [
                        ["label", "组名称 / 箱号"],
                        ["cartons", "箱数"],
                        ["gross_weight", "单箱毛重 kg"],
                        ["net_weight", "单箱净重 kg"],
                        ["length", "外箱长 cm"],
                        ["width", "外箱宽 cm"],
                        ["height", "外箱高 cm"],
                      ] as const
                    ).map(([key, label]) => (
                      <Field
                        key={key}
                        className={key === "label" ? "col-span-2" : ""}
                        label={label}
                        type={key === "label" ? "text" : "number"}
                        value={g[key]}
                        onChange={(v) => updateGroup(i, key, v)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() =>
                patch("packing_groups", [
                  ...data.packing_groups,
                  emptyGroup(crypto.randomUUID()),
                ])
              }
            >
              添加装箱组
            </Button>
          </FormSection>
        )}
        {type !== "packing" ? (
          <>
            <FormSection
              title="收款账户"
              description="PI、CI 共用币种账户；已保存单据保留本单资料，可编辑或手动覆盖。"
            >
              <label className={`${labelClassName} max-w-md`}>
                银行配置
                <select
                  aria-label="银行配置"
                  className={inputClassName}
                  value={data.bank_profile_id}
                  onChange={(e) => selectBank(e.target.value)}
                >
                  <option value="">本单手动填写</option>
                  {data.bank_profile_id &&
                    !settings.banks.some(
                      (b) => b.id === data.bank_profile_id,
                    ) && (
                      <option value={data.bank_profile_id}>
                        本单已保存账户（{data.currency}）
                      </option>
                    )}
                  {settings.banks
                    .filter((b) => b.currency === data.currency)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </label>
              <details
                className="mt-2"
                open={bankOpen}
                onToggle={(e) => setBankOpen(e.currentTarget.open)}
              >
                <summary className="cursor-pointer text-xs font-medium text-blue-700">
                  编辑本单账户 / 手动覆盖
                </summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {(
                    [
                      ["bank_name", "银行名称"],
                      ["account_name", "账户名称"],
                      ["account_no", "账号"],
                      ["swift", "SWIFT / 本地代码"],
                      ["address", "银行地址"],
                      ["remark", "银行备注"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      value={data.bank[key]}
                      onChange={(v) =>
                        patch("bank", { ...data.bank, [key]: v })
                      }
                      className="sm:col-span-2"
                      rows={key === "account_name" ? 1 : 2}
                      wide={key === "address" || key === "account_name"}
                    />
                  ))}
                  <Field
                    label="手动覆盖完整银行信息（可选）"
                    value={data.bank_override}
                    onChange={(v) => patch("bank_override", v)}
                    className="sm:col-span-2 xl:col-span-4"
                    wide
                  />
                </div>
              </details>
            </FormSection>
            <details className="rounded-xl border border-slate-200 bg-white/95 p-3 sm:p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-950">
                条款{" "}
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {data.terms.filter(Boolean).length} 条 · 点击编辑
                </span>
              </summary>
              <div className="mt-2">
                <label className={labelClassName}>
                  每行一条，最多四条
                  <textarea
                    aria-label="每行一条，最多四条"
                    rows={5}
                    className={textareaClassName}
                    value={data.terms.join("\n")}
                    onChange={(e) => patch("terms", e.target.value.split("\n"))}
                  />
                </label>
              </div>
            </details>
          </>
        ) : (
          <FormSection title="备注与声明">
            <div className="grid gap-2 md:grid-cols-2">
              <Field
                label="备注"
                value={data.remark}
                onChange={(v) => patch("remark", v)}
                wide
              />
              <Field
                label="声明"
                value={data.declaration}
                onChange={(v) => patch("declaration", v)}
                wide
              />
            </div>
          </FormSection>
        )}
      </fieldset>
      <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur [&_button]:h-9 [&_a]:h-9">
        <span className="mr-auto text-sm text-slate-700">
          {total
            ? type === "packing"
              ? `${total.quantity} 件 · ${total.cartons} 箱 · ${total.cbm} CBM`
              : `${total.quantity} 件 · ${data.currency} ${total.amount}`
            : "请检查数字输入"}
          {dirty ? " · 未保存" : ""}
        </span>
        <Button disabled={disabled || !dirty} onClick={() => void run("save")}>
          {busy === "save"
            ? "保存中…"
            : saved?.current_version
              ? "保存修订草稿"
              : "保存草稿"}
        </Button>
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => void run("preview")}
        >
          保存并预览
        </Button>
        <Button
          disabled={disabled || (!dirty && saved?.status === "issued")}
          onClick={() => void run("issue")}
        >
          {busy === "issue" ? "正在生成…" : "确认出具 PDF"}
        </Button>
        {saved && (
          <Button
            variant="danger"
            disabled={disabled}
            onClick={() => void run("void")}
          >
            作废
          </Button>
        )}
        <Button href="/trade-documents" variant="ghost">
          返回列表
        </Button>
      </div>
      {preview && (
        <FormSection
          title="PDF 预览"
          description={
            dirty
              ? "当前显示上次保存的内容，保存后更新预览。"
              : saved?.status === "draft"
                ? "草稿预览；确认出具后固定保存正式 PDF。"
                : "已出具版本的 PDF，不受后续设置变化影响。"
          }
        >
          <a
            className="text-sm font-semibold text-blue-700 hover:underline"
            href={`${preview}&download=1`}
            target="_blank"
            rel="noreferrer"
          >
            下载当前 PDF
          </a>
          <iframe
            title="单据 PDF 预览"
            src={preview}
            className="mt-3 h-[650px] w-full rounded-lg border border-slate-200"
          />
        </FormSection>
      )}
      {!!versions.length && (
        <FormSection title="已出具的历史版本">
          <div className="space-y-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex flex-wrap items-center gap-3 text-sm"
              >
                <span>
                  第 {v.version} 版 · {v.document_no} ·{" "}
                  {new Date(v.created_at).toLocaleString("zh-CN", {
                    timeZone: "Asia/Hong_Kong",
                  })}
                </span>
                <a
                  className="text-blue-700"
                  target="_blank"
                  rel="noreferrer"
                  href={`/api/trade-documents/${v.document_id}/pdf?version=${v.version}`}
                >
                  预览
                </a>
                <a
                  className="text-blue-700"
                  href={`/api/trade-documents/${v.document_id}/pdf?version=${v.version}&download=1`}
                >
                  下载
                </a>
              </div>
            ))}
          </div>
        </FormSection>
      )}
    </div>
  );
}
