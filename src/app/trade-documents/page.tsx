import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  inputClassName,
  labelClassName,
  tableHeadClassName,
  tableRowClassName,
  tableShellClassName,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { DOCUMENT_TYPES, isDocumentType } from "@/lib/trade-documents/model";
export const dynamic = "force-dynamic";
export default async function TradeDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    status?: string;
    search?: string;
    page?: string;
    order?: string;
  }>;
}) {
  await requireUser();
  const p = await searchParams,
    page = Math.max(1, Number.parseInt(p.page ?? "1") || 1),
    size = 30;
  let query = getSupabaseAdminClient()
    .from("trade_documents")
    .select(
      "id,document_type,document_no,document_date,status,current_version,order_id,buyer_name:data->buyer->>name",
      { count: "exact" },
    );
  if (isDocumentType(p.type)) query = query.eq("document_type", p.type);
  if (["draft", "issued", "void"].includes(p.status ?? ""))
    query = query.eq("status", p.status);
  if (p.order && /^[a-f0-9-]{36}$/i.test(p.order))
    query = query.eq("order_id", p.order);
  if (p.search) {
    const search = p.search.replace(/[%_(),"\\]/g, "").slice(0, 80);
    if (search)
      query = query.or(
        `document_no.ilike.%${search}%,data->buyer->>name.ilike.%${search}%`,
      );
  }
  const { data, error, count } = await query
    .order("document_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  const link = (next: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (v && k !== "page") q.set(k, v);
    q.set("page", String(next));
    return `/trade-documents?${q}`;
  };
  return (
    <AppShell>
      <PageHeader
        title="外贸单据"
        description="按客户需要制作 PI、CI 和装箱单。单据独立于成交订单，未成单 PI 可以保留。"
      />
      <div className="mb-5 flex flex-wrap gap-3">
        <Button href="/trade-documents/new?type=pi">新建 PI</Button>
        <Button href="/trade-documents/new?type=ci" variant="secondary">
          新建 CI
        </Button>
        <Button href="/trade-documents/new?type=packing" variant="secondary">
          新建装箱单
        </Button>
        <Button href="/trade-documents/settings" variant="ghost">
          公司、银行与条款设置
        </Button>
      </div>
      <form>
        <FilterBar className="grid gap-3 md:grid-cols-4">
          <label className={labelClassName}>
            单据类型
            <select
              name="type"
              defaultValue={p.type ?? ""}
              className={inputClassName}
            >
              <option value="">全部</option>
              {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClassName}>
            状态
            <select
              name="status"
              defaultValue={p.status ?? ""}
              className={inputClassName}
            >
              <option value="">全部</option>
              <option value="draft">草稿</option>
              <option value="issued">已出具</option>
              <option value="void">已作废</option>
            </select>
          </label>
          <label className={labelClassName}>
            编号 / 客户
            <input
              name="search"
              defaultValue={p.search}
              className={inputClassName}
            />
          </label>
          {p.order && <input type="hidden" name="order" value={p.order} />}
          <div className="flex items-end gap-2">
            <Button type="submit">筛选</Button>
            <Button href="/trade-documents" variant="secondary">
              清空
            </Button>
          </div>
        </FilterBar>
      </form>
      {p.order && (
        <p className="mb-4 text-sm text-slate-600">
          当前显示关联此订单的单据。
          <Link
            className="ml-2 text-blue-700"
            href={`/trade-documents/new?order=${p.order}`}
          >
            为此订单制作单据
          </Link>
        </p>
      )}
      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
        >
          单据读取失败：{error.message}
        </div>
      ) : !data?.length ? (
        <EmptyState message="暂无单据。客户需要时，可独立新建，也可从订单页面进入。" />
      ) : (
        <div className={tableShellClassName}>
          <table className="w-full min-w-[850px] text-sm">
            <thead className={tableHeadClassName}>
              <tr>
                {[
                  "操作",
                  "类型",
                  "编号",
                  "日期",
                  "买方",
                  "状态",
                  "历史版本",
                  "关联订单",
                ].map((x) => (
                  <th key={x} className="px-4 py-3 text-left">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((doc) => (
                <tr key={doc.id} className={tableRowClassName}>
                  <td className="px-4 py-3">
                    <Button
                      href={`/trade-documents/${doc.id}`}
                      variant="secondary"
                      className="h-8"
                    >
                      查看 / 编辑
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    {doc.document_type === "packing"
                      ? "装箱单"
                      : doc.document_type.toUpperCase()}
                  </td>
                  <td className="px-4 py-3 font-medium">{doc.document_no}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {doc.document_date}
                  </td>
                  <td
                    className="max-w-[220px] truncate px-4 py-3"
                    title={String(doc.buyer_name ?? "")}
                  >
                    {String(doc.buyer_name || "未填写")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        doc.status === "issued"
                          ? "success"
                          : doc.status === "void"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {doc.status === "issued"
                        ? "已出具"
                        : doc.status === "void"
                          ? "已作废"
                          : "草稿"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{doc.current_version}</td>
                  <td className="px-4 py-3">
                    {doc.order_id ? (
                      <Link
                        className="text-blue-700"
                        href={`/orders/${doc.order_id}/edit`}
                      >
                        查看订单
                      </Link>
                    ) : (
                      "独立单据"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          共 {count ?? 0} 份 · 第 {page} 页
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Button href={link(page - 1)} variant="secondary">
              上一页
            </Button>
          )}
          {page * size < (count ?? 0) && (
            <Button href={link(page + 1)} variant="secondary">
              下一页
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
