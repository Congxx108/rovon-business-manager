import { AppShell } from "@/components/app-shell";
import { CsvExportButton } from "@/components/csv-export-button";
import { MarkShippedForm } from "@/components/mark-shipped-form";
import { PageHeader } from "@/components/page-header";
import { StatusNote } from "@/components/status-note";
import { Badge, Button, FilterBar, inputClassName, labelClassName, tableHeadClassName, tableShellClassName } from "@/components/ui";
import { ShippingStatusBadge } from "@/components/shipping-status-badge";
import { formatDate, formatNumber, formatRmb } from "@/lib/format";
import { getOrderFilterOptions, getOrders } from "@/lib/data";
import { isPendingShippingStatus } from "@/lib/shipping";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    country?: string;
    productLine?: string;
    month?: string;
    shippingStatus?: string;
    pendingShipping?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const { page, ...filters } = await searchParams;
  const pageSize = 50;
  const currentPage = Math.max(1, Number(page ?? "1") || 1);
  const offset = (currentPage - 1) * pageSize;
  const [result, filterOptions, exportResult] = await Promise.all([
    getOrders(filters, pageSize, offset),
    getOrderFilterOptions(),
    getOrders({}, 10000),
  ]);
  const repeatOrderIds = buildRepeatOrderIds(exportResult.data);
  const exportRows = exportResult.data.map((order) => ({
    订单日期: order.order_date,
    订单编号: order.order_no,
    客户名: order.customer_name,
    联系方式: order.contact ?? "",
    "国家/渠道": order.country ?? "",
    产品线: order.product_line ?? "",
    数量: order.quantity,
    销售额RMB: order.sales_amount_rmb,
    付款状态: order.payment_status,
    定金金额RMB: order.deposit_amount_rmb ?? 0,
    客户支付货币: order.payment_currency ?? "",
    人民币收款方式: order.rmb_payment_method ?? "",
    付款备注: order.payment_remark ?? "",
    订单状态: order.order_status,
    "是否取消/退款": order.is_refund_or_cancelled ? "是" : "否",
    发货状态: order.shipping_status,
    物流方式: order.shipping_method ?? "",
    "物流/快运公司": order.shipping_company ?? "",
    "物流单号/货运单号": order.tracking_no ?? "",
    发货日期: order.shipping_date ?? "",
    发货备注: order.shipping_remark ?? "",
    备注: order.remark ?? "",
  }));
  const paginationHref = (targetPage: number) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return `/orders${query ? `?${query}` : ""}`;
  };

  return (
    <AppShell wide>
      <PageHeader
        title="订单管理"
        description="记录已验证的核心订单字段，销售统计会自动排除取消/退款订单。"
        actionHref="/orders/new"
        actionLabel="新增订单"
        secondaryActionHref="/orders/import"
        secondaryActionLabel="导入订单"
        actions={<CsvExportButton filenamePrefix="orders" rows={exportRows} label="导出订单 CSV" />}
      />
      <StatusNote configured={result.configured} error={result.error ?? filterOptions.error} />
      <FilterBar className="list-filter-panel">
      <form className="list-filter-form order-filter-form" action="/orders">
        <label className={`${labelClassName} list-filter-search`}>
          搜索
          <input
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="客户名 / 联系方式 / 订单编号"
            className={inputClassName}
          />
        </label>
        <FilterSelect label="国家/渠道" name="country" value={filters.country} options={filterOptions.data.countries} />
        <FilterSelect label="产品线" name="productLine" value={filters.productLine} options={filterOptions.data.productLines} />
        <FilterSelect label="月份" name="month" value={filters.month} options={filterOptions.data.months} />
        <FilterSelect label="发货状态" name="shippingStatus" value={filters.shippingStatus} options={filterOptions.data.shippingStatuses} />
        <div className="list-filter-actions">
          <Button type="submit">筛选</Button>
          <Button href="/orders?pendingShipping=1" variant="warning">待发货订单</Button>
          <Button href="/orders" variant="secondary">清空</Button>
        </div>
      </form>
      </FilterBar>

      <div className={`${tableShellClassName} order-list-shell`}>
        <table className="business-table order-list-table w-full table-fixed text-left text-sm [&_td]:whitespace-nowrap">
          <colgroup>
            <col className="order-list-action-col" />
            <col className="w-[104px]" />
            <col className="w-[208px]" />
            <col className="w-[160px]" />
            <col className="w-[152px]" />
            <col className="w-[96px]" />
            <col className="w-[80px]" />
            <col className="w-[72px]" />
            <col className="w-[120px]" />
            <col className="w-[160px]" />
            <col className="w-[96px]" />
            <col className="w-[144px]" />
            <col className="w-[96px]" />
            <col className="w-[112px]" />
            <col className="w-[144px]" />
            <col className="w-[136px]" />
          </colgroup>
          <thead className={tableHeadClassName}>
            <tr>
              <th className={stickyActionHeaderClassName}>操作</th>
              <th className="px-4 py-3 font-medium">订单日期</th>
              <th className="px-4 py-3 font-medium">订单编号</th>
              <th className="px-4 py-3 font-medium">客户名</th>
              <th className="px-4 py-3 font-medium">联系方式</th>
              <th className="px-4 py-3 font-medium">国家/渠道</th>
              <th className="px-4 py-3 font-medium">产品线</th>
              <th className="px-4 py-3 text-right font-medium">数量</th>
              <th className="px-4 py-3 text-right font-medium">销售额RMB</th>
              <th className="px-4 py-3 font-medium">付款状态</th>
              <th className="px-4 py-3 font-medium">发货状态</th>
              <th className="px-4 py-3 font-medium">发货日期 / <br />待发货</th>
              <th className="px-4 py-3 font-medium">物流方式</th>
              <th className="px-4 py-3 font-medium">物流/快运公司</th>
              <th className="px-4 py-3 font-medium">物流单号/<br />货运单号</th>
              <th className="px-4 py-3 font-medium">取消/退款</th>
            </tr>
          </thead>
          <tbody>
            {result.data.length ? (
              result.data.map((order) => {
                const isRepeatOrder = repeatOrderIds.has(order.id);
                return (
                <tr key={order.id} className={orderRowClassName(order)}>
                  <td className={stickyActionCellClassName}>
                    <div className="order-list-actions">
                      <Button href={`/orders/${order.id}/edit`} variant="secondary" className="h-8 px-3">编辑</Button>
                      <Button href={`/trade-documents?order=${order.id}`} variant="ghost" className="h-8 px-3">单据（可选）</Button>
                      {!order.is_refund_or_cancelled && isPendingShippingStatus(order.shipping_status) ? (
                        <MarkShippedForm
                          orderId={order.id}
                          triggerClassName="order-list-shipping-trigger"
                          initialShipping={{
                            shipping_method: order.shipping_method,
                            shipping_company: order.shipping_company,
                            tracking_no: order.tracking_no,
                            shipping_date: order.shipping_date,
                            shipping_remark: order.shipping_remark,
                          }}
                          orderNo={order.order_no}
                          customerName={order.customer_name}
                          country={order.country}
                          quantity={order.quantity}
                          salesAmountRmb={Number(order.sales_amount_rmb ?? 0)}
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatDate(order.order_date)}</td>
                  <td className="truncate px-4 py-3 font-medium" title={order.order_no}>{order.order_no}</td>
                  <td className="px-4 py-3" title={order.customer_name ?? ""}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{order.customer_name}</span>
                      {isRepeatOrder ? <Badge tone="info">返单</Badge> : null}
                    </div>
                  </td>
                  <td className="truncate px-4 py-3" title={order.contact ?? ""}>{order.contact ?? "-"}</td>
                  <td className="truncate px-4 py-3" title={order.country ?? ""}>{order.country ?? "-"}</td>
                  <td className="truncate px-4 py-3" title={order.product_line ?? ""}>{order.product_line ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatNumber(order.quantity)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatRmb(Number(order.sales_amount_rmb))}</td>
                  <td className="px-4 py-3">
                    <PaymentSummary status={order.payment_status} depositAmount={Number(order.deposit_amount_rmb ?? 0)} currency={order.payment_currency} />
                  </td>
                  <td className="px-4 py-3"><ShippingStatusBadge value={order.shipping_status} /></td>
                  <td className="px-4 py-3"><ShippingTimingBadge order={order} /></td>
                  <td className="truncate px-4 py-3" title={order.shipping_method ?? ""}>{order.shipping_method ?? "-"}</td>
                  <td className="truncate px-4 py-3" title={order.shipping_company ?? ""}>{order.shipping_company ?? "-"}</td>
                  <td className="truncate px-4 py-3" title={order.tracking_no ?? ""}>{order.tracking_no ?? "-"}</td>
                  <td className="px-4 py-3">
                    {order.is_refund_or_cancelled ? (
                      <Badge tone="danger"><span className="leading-4">取消/退款，<br />不计入统计</span></Badge>
                    ) : (
                      "否"
                    )}
                  </td>
                </tr>
              );
              })
            ) : (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={16}>暂无订单数据，请先新增订单或导入历史订单</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>
          第 {currentPage} 页，每页最多 {pageSize} 条
        </span>
        <div className="flex gap-2">
          {currentPage > 1 ? (
            <Button href={paginationHref(currentPage - 1)} variant="secondary">
              上一页
            </Button>
          ) : null}
          {result.data.length === pageSize ? (
            <Button href={paginationHref(currentPage + 1)} variant="secondary">
              下一页
            </Button>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value?: string;
  options: string[];
}) {
  return (
    <label className={labelClassName}>
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className={inputClassName}
      >
        <option value="">全部</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function PaymentSummary({ status, depositAmount, currency }: { status: string; depositAmount: number; currency?: string | null }) {
  const label = status === "定金" ? `定金 ${depositAmount > 0 ? formatRmb(depositAmount) : ""}`.trim() : "已付全款";
  return (
    <div className="order-list-payment" title={currency ? `${label} / ${currency}` : label}>
      <div>{label}</div>
      <div className="text-slate-500">{currency || "\u00a0"}</div>
    </div>
  );
}

function ShippingTimingBadge({ order }: { order: { shipping_status: string; shipping_date: string | null; order_date: string | null } }) {
  if (order.shipping_status === "已发货") {
    if (order.shipping_date) return <Badge tone="success">{formatDate(order.shipping_date)}</Badge>;
    return <Badge tone="warning">已发货｜未填日期</Badge>;
  }

  if (isPendingShippingStatus(order.shipping_status)) {
    if (!order.order_date) return <>-</>;
    const days = daysSince(order.order_date);
    const label = days <= 0 ? "下单 0 天" : `已等 ${days} 天`;
    if (days >= 8) return <Badge tone="danger">{label}</Badge>;
    if (days >= 4) return <Badge tone="warning">{label}</Badge>;
    return <Badge>{label}</Badge>;
  }

  if (order.shipping_status === "无需发货") return <Badge>{order.shipping_status}</Badge>;
  return <>-</>;
}

function daysSince(date: string) {
  const current = dateFromYmd(todayInHongKong());
  const orderDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(orderDate.getTime())) return 0;
  return Math.max(0, Math.floor((current.getTime() - orderDate.getTime()) / 86_400_000));
}

function todayInHongKong() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function dateFromYmd(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

const stickyActionHeaderClassName =
  "sticky left-0 z-10 border-r border-slate-200 bg-slate-50/95 px-4 py-3 font-medium shadow-[8px_0_16px_-18px_rgba(15,23,42,0.45)]";

const stickyActionCellClassName =
  "sticky left-0 z-[1] border-r border-slate-100 px-4 py-3 shadow-[8px_0_16px_-18px_rgba(15,23,42,0.45)]";

function orderRowClassName(order: { is_refund_or_cancelled: boolean }) {
  return `order-list-row border-b border-slate-100 align-middle${order.is_refund_or_cancelled ? " order-list-cancelled" : ""}`;
}

function buildRepeatOrderIds(orders: Array<{
  id: string;
  contact: string | null;
  customer_name: string | null;
  country: string | null;
  order_date: string;
  created_at: string;
  is_refund_or_cancelled: boolean;
}>) {
  const grouped = new Map<string, typeof orders>();

  for (const order of orders) {
    if (order.is_refund_or_cancelled) continue;
    const key = customerOrderKey(order);
    if (!key) continue;
    const group = grouped.get(key) ?? [];
    group.push(order);
    grouped.set(key, group);
  }

  const repeatIds = new Set<string>();
  for (const group of grouped.values()) {
    group
      .sort((a, b) => `${a.order_date ?? ""}|${a.created_at ?? ""}|${a.id}`.localeCompare(`${b.order_date ?? ""}|${b.created_at ?? ""}|${b.id}`))
      .slice(1)
      .forEach((order) => repeatIds.add(order.id));
  }

  return repeatIds;
}

function customerOrderKey(order: { contact: string | null; customer_name: string | null; country: string | null }) {
  const contact = order.contact?.trim().toLowerCase();
  if (contact) return `contact:${contact}`;
  const name = order.customer_name?.trim().toLowerCase();
  if (!name) return null;
  return `name:${name}|country:${order.country?.trim().toLowerCase() ?? ""}`;
}
