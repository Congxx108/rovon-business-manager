import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FormField } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { Button, FormSection } from "@/components/ui";
import { updateCustomerFollowFields } from "@/app/customers/actions";
import { getCustomerById } from "@/lib/data";
import { formatDate, formatNumber, formatRmb } from "@/lib/format";

export const dynamic = "force-dynamic";

const followResultOptions = ["已联系-有兴趣", "已联系-暂不需要", "未回复", "已下新单", "不再跟进", "其他"];

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const result = await getCustomerById(id);
  const customer = result.data;
  if (!customer) notFound();

  const saveAction = updateCustomerFollowFields.bind(null, id);

  return (
    <AppShell>
      <PageHeader title="客户跟进编辑" description="客户统计字段来自订单自动汇总，只能编辑人工跟进字段。" />

      {error ? <Message tone="error" text={error} /> : null}
      {saved ? <Message tone="success" text="客户跟进信息已保存。" /> : null}

      <section className="mb-5 rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50">
        <h2 className="text-base font-semibold">只读客户统计</h2>
        <p className="mt-1 text-sm text-slate-500">这些字段由订单自动汇总生成，避免手工改乱历史统计。</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ReadOnly label="客户名" value={customer.name} />
          <ReadOnly label="联系方式" value={customer.contact ?? "-"} />
          <ReadOnly label="国家/渠道" value={customer.country ?? "-"} />
          <ReadOnly label="首单日期" value={formatDate(customer.first_order_date)} />
          <ReadOnly label="最近下单日期" value={formatDate(customer.last_order_date)} />
          <ReadOnly label="历史订单数" value={formatNumber(customer.total_orders)} />
          <ReadOnly label="历史购买总数量" value={formatNumber(customer.total_quantity)} />
          <ReadOnly label="历史销售额RMB" value={formatRmb(Number(customer.total_sales_rmb ?? 0))} />
          <ReadOnly label="复购状态" value={customer.repurchase_status} />
          <ReadOnly label="客户价值等级" value={customer.customer_value_level} />
          <ReadOnly label="客户复购潜力" value={customer.repurchase_potential} />
          <ReadOnly label="跟进优先级" value={customer.follow_priority} />
          <ReadOnly label="建议跟进动作" value={customer.follow_suggestion ?? "-"} />
        </div>
      </section>

      <form action={saveAction} className="max-w-3xl space-y-5">
        <FormSection title="人工跟进字段" description="这里只维护跟进记录，不影响订单汇总出来的客户统计。">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="最后跟进日期" name="last_follow_date" type="date" defaultValue={customer.last_follow_date ?? ""} />
            <label className="block text-sm font-medium text-slate-700">
              最后跟进结果
              <select
                name="last_follow_result"
                defaultValue={customer.last_follow_result ?? ""}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm shadow-slate-200/40 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              >
                <option value="">未填写</option>
                {followResultOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <FormField label="下次联系日期" name="next_follow_date" type="date" defaultValue={customer.next_follow_date ?? ""} />
          </div>
          <div className="mt-4">
            <FormField label="备注" name="remark" textarea defaultValue={customer.remark ?? ""} />
          </div>
        </FormSection>
        <div className="mt-6 flex justify-end gap-3">
          <Button href="/customers" variant="secondary">返回客户列表</Button>
          <Button type="submit">保存跟进信息</Button>
        </div>
      </form>
    </AppShell>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function Message({ tone, text }: { tone: "success" | "error"; text: string }) {
  const className =
    tone === "success"
      ? "mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
      : "mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800";
  return <div className={className}>{text}</div>;
}
