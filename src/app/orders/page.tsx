import { AppShell } from "@/components/app-shell";
import { CsvExportButton } from "@/components/csv-export-button";
import { MarkShippedForm } from "@/components/mark-shipped-form";
import { PageHeader } from "@/components/page-header";
import { StatusNote } from "@/components/status-note";
import { Badge, Button, FilterBar, inputClassName, labelClassName, tableHeadClassName, tableRowClassName, tableShellClassName } from "@/components/ui";
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
    <AppShell>
      <PageHeader
        title="订单管理"
        description="记录已验证的核心订单字段，销售统计会自动排除取消/退款订单。"
        actionHref="/orders/new"
        actionLabel="新增订单"
        secondaryActionHref="/orders/import"
        secondaryActionLabel="导入订单"
      />
      <StatusNote configured={result.configured} error={result.error ?? filterOptions.error} />
      <div className="mb-4 flex justify-end">
        <CsvExportButton filenamePrefix="orders" rows={exportRows} label="导出订单 CSV" />
      </div>

      <FilterBar>
      <form className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto_auto_auto]" action="/orders">
        <label className={labelClassName}>
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
        <Button type="submit" className="self-end">筛选</Button>
        <Button href="/orders?pendingShipping=1" variant="warning" className="self-end">待发货订单</Button>
        <Button href="/orders" variant="secondary" className="self-end">清空</Button>
      </form>
      </FilterBar>

      <div className={tableShellClassName}>
        <table className="w-full min-w-[1700px] table-fixed text-left text-sm [&_td]:whitespace-nowrap">
          <colgroup>
            <col className="w-[180px]" />
            <col className="w-[90px]" />
            <col className="w-[130px]" />
            <col className="w-[160px]" />
            <col className="w-[160px]" />
            <col className="w-[100px]" />
            <col className="w-[80px]" />
            <col className="w-[80px]" />
            <col className="w-[110px]" />
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[120px]" />
            <col className="w-[140px]" />
            <col className="w-[150px]" />
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
              <th className="px-4 py-3 font-medium">物流方式</th>
              <th className="px-4 py-3 font-medium">物流/快运公司</th>
              <th className="px-4 py-3 font-medium">物流单号/货运单号</th>
              <th className="px-4 py-3 font-medium">取消/退款</th>
            </tr>
          </thead>
          <tbody>
            {result.data.length ? (
              result.data.map((order) => {
                const isRepeatOrder = repeatOrderIds.has(order.id);
                return (
                <tr key={order.id} className={orderRowClassName(order, isRepeatOrder)}>
                  <td className={stickyActionCellClassName(order, isRepeatOrder)}>
                    <div className="flex min-w-[150px] flex-wrap gap-2">
                      <Button href={`/orders/${order.id}/edit`} variant="secondary" className="h-8 px-3">编辑</Button>
                      {!order.is_refund_or_cancelled && isPendingShippingStatus(order.shipping_status) ? (
                        <MarkShippedForm
                          orderId={order.id}
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
                  <td className="px-4 py-3">{formatPaymentStatus(order.payment_status, Number(order.deposit_amount_rmb ?? 0), order.payment_currency)}</td>
                  <td className="px-4 py-3"><ShippingStatusBadge value={order.shipping_status} /></td>
                  <td className="truncate px-4 py-3" title={order.shipping_method ?? ""}>{order.shipping_method ?? "-"}</td>
                  <td className="truncate px-4 py-3" title={order.shipping_company ?? ""}>{order.shipping_company ?? "-"}</td>
                  <td className="truncate px-4 py-3" title={order.tracking_no ?? ""}>{order.tracking_no ?? "-"}</td>
                  <td className="px-4 py-3">
                    {order.is_refund_or_cancelled ? (
                      <Badge tone="danger">取消/退款，不计入统计</Badge>
                    ) : (
                      "否"
                    )}
                  </td>
                </tr>
              );
              })
            ) : (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={15}>暂无订单数据，请先新增订单或导入历史订单</td>
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

function formatPaymentStatus(paymentStatus: string, depositAmount: number, paymentCurrency?: string | null) {
  const status = paymentStatus === "定金" ? `定金 ${depositAmount > 0 ? formatRmb(depositAmount) : ""}`.trim() : "已付全款";
  return paymentCurrency ? `${status} / ${paymentCurrency}` : status;
}

const stickyActionHeaderClassName =
  "sticky left-0 z-30 border-r border-slate-200 bg-slate-50/95 px-4 py-3 font-medium shadow-[8px_0_16px_-18px_rgba(15,23,42,0.45)]";

function stickyActionCellClassName(order: { is_refund_or_cancelled: boolean }, isRepeatOrder: boolean) {
  const background = order.is_refund_or_cancelled ? "bg-rose-50" : isRepeatOrder ? "bg-blue-50" : "bg-white";
  return `sticky left-0 z-20 border-r border-slate-100 px-4 py-3 shadow-[8px_0_16px_-18px_rgba(15,23,42,0.45)] transition-colors ${background}`;
}

function orderRowClassName(order: { is_refund_or_cancelled: boolean }, isRepeatOrder: boolean) {
  if (order.is_refund_or_cancelled) return "border-b border-slate-100 bg-rose-50/70 align-middle transition-colors hover:bg-rose-50";
  if (isRepeatOrder) return "border-b border-slate-100 bg-blue-50/45 align-middle transition-colors hover:bg-blue-50/70";
  return tableRowClassName;
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
