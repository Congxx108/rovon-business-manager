"use client";
import { useState } from "react";
import {
  Button,
  FormSection,
  inputClassName,
  labelClassName,
  textareaClassName,
} from "@/components/ui";
import {
  EMPTY_BANK,
  type BankProfile,
  type TradeSettings,
} from "@/lib/trade-documents/model";
export function TradeSettingsEditor({
  initial,
  revision: initialRevision,
}: {
  initial: TradeSettings;
  revision: number;
}) {
  const [data, setData] = useState(initial),
    [revision, setRevision] = useState(initialRevision),
    [selected, setSelected] = useState(initial.banks[0]?.id ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const bank = data.banks.find((b) => b.id === selected);
  function updateBank<K extends keyof BankProfile>(
    key: K,
    value: BankProfile[K],
  ) {
    setData({
      ...data,
      banks: data.banks.map((b) =>
        b.id === selected ? { ...b, [key]: value } : b,
      ),
    });
  }
  function addBank() {
    const id = crypto.randomUUID();
    setData({
      ...data,
      banks: [
        ...data.banks,
        {
          id,
          name: "新收款账户",
          document_type: "pi",
          currency: "USD",
          ...EMPTY_BANK,
        },
      ],
    });
    setSelected(id);
  }
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/trade-documents/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revision, data }),
        }),
        json = await r.json();
      if (!r.ok) throw new Error(json.error);
      setRevision(json.revision);
      setMessage("设置已保存。已有单据及历史 PDF 保持原资料。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}
      <fieldset disabled={busy} className="space-y-5">
        <FormSection
          title="公司信息"
          description="作为新单据的默认卖方资料；已有单据保存自己的副本。"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                ["name", "公司名称"],
                ["contact", "联系人"],
                ["phone", "联系电话"],
                ["address", "详细地址"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className={labelClassName}>
                {label}
                <input
                  className={inputClassName}
                  value={data.seller[key]}
                  onChange={(e) =>
                    setData({
                      ...data,
                      seller: { ...data.seller, [key]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </FormSection>
        <FormSection
          title="币种与银行账户"
          description="PI、CI 原表账户分别保留。请核对实际使用的账户与地址后出具单据。单据币种与订单收款币种独立。"
        >
          <label className={labelClassName}>
            可选币种（逗号分隔）
            <input
              className={inputClassName}
              value={data.currencies.join(",")}
              onChange={(e) =>
                setData({
                  ...data,
                  currencies: e.target.value
                    .split(/[,，]/)
                    .map((x) => x.trim()),
                })
              }
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <select
              aria-label="选择银行配置"
              className={`${inputClassName} mt-0 max-w-lg`}
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">选择账户</option>
              {data.banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.currency}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              disabled={data.banks.length >= 60}
              onClick={addBank}
            >
              添加账户
            </Button>
          </div>
          {bank && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className={labelClassName}>
                适用单据
                <select
                  className={inputClassName}
                  value={bank.document_type}
                  onChange={(e) =>
                    updateBank("document_type", e.target.value as "pi" | "ci")
                  }
                >
                  <option value="pi">PI</option>
                  <option value="ci">CI</option>
                </select>
              </label>
              {(
                [
                  ["name", "配置名称"],
                  ["currency", "币种代码"],
                  ["bank_name", "银行名称"],
                  ["account_name", "账户名称"],
                  ["account_no", "账号"],
                  ["swift", "SWIFT / 本地代码"],
                  ["address", "银行地址"],
                  ["remark", "备注"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className={labelClassName}>
                  {label}
                  <textarea
                    className={textareaClassName}
                    rows={key === "address" || key === "account_name" ? 3 : 1}
                    value={bank[key]}
                    onChange={(e) => updateBank(key, e.target.value)}
                  />
                </label>
              ))}
              <Button
                variant="ghost"
                onClick={() => {
                  setData({
                    ...data,
                    banks: data.banks.filter((b) => b.id !== selected),
                  });
                  setSelected("");
                }}
              >
                移除此配置
              </Button>
            </div>
          )}
        </FormSection>
        <FormSection title="常用条款">
          <label className={labelClassName}>
            每行一条，最多四条
            <textarea
              rows={6}
              className={textareaClassName}
              value={data.terms.join("\n")}
              onChange={(e) =>
                setData({ ...data, terms: e.target.value.split("\n") })
              }
            />
          </label>
        </FormSection>
      </fieldset>
      <div className="sticky bottom-3 flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? "保存中…" : "保存设置"}
        </Button>
        <Button href="/trade-documents" variant="secondary">
          返回单据
        </Button>
      </div>
    </div>
  );
}
