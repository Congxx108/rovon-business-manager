import { AppShell } from "@/components/app-shell";
import { CsvExportButton } from "@/components/csv-export-button";
import { MarkShippedForm } from "@/components/mark-shipped-form";
import { PageHeader } from "@/components/page-header";
import { StatusNote } from "@/components/status-note";
import { Badge, Button, tableHeadClassName, tableRowClassName, tableShellClassName } from "@/components/ui";
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

      <form className="mb-5 grid gap-3 rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto_auto_auto]" action="/orders">
        <label className="text-sm font-medium text-slate-700">
          搜索
          <input
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="客户名 / 联系方式 / 订单编号"
            className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
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

      <div className={tableShellClassName}>
        <table className="w-full min-w-[1700px] table-fixed text-left text-sm [&_td]:whitespace-nowrap">
          <colgroup>
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
            <col className="w-[180px]" />
          </colgroup>
          <thead className={tableHeadClassName}>
            <tr>
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
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {result.data.length ? (
              result.data.map((order) => (
                <tr key={order.id} className={order.is_refund_or_cancelled ? "border-b border-slate-100 bg-rose-50/70" : tableRowClassName}>
                  <td className="px-4 py-3">{formatDate(order.order_date)}</td>
                  <td className="truncate px-4 py-3 font-medium" title={order.order_no}>{order.order_no}</td>
                  <td className="truncate px-4 py-3" title={order.customer_name ?? ""}>{order.customer_name}</td>
                  <td className="truncate px-4 py-3" title={order.contact ?? ""}>{order.contact ?? "-"}</td>
                  <td className="truncate px-4 py-3" title={order.country ?? ""}>{order.country ?? "-"}</td>
                  <td className="truncate px-4 py-3" title={order.product_line ?? ""}>{order.product_line ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatNumber(order.quantity)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatRmb(Number(order.sales_amount_rmb))}</td>
                  <td className="px-4 py-3">{formatPaymentStatus(order.payment_status, Number(order.deposit_amount_rmb ?? 0))}</td>
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
                  <td className="px-4 py-3">
                    <div className="flex min-w-[170px] flex-wrap gap-2">
                      <Button href={`/orders/${order.id}/edit`} variant="secondary" className="h-8 px-3">编辑</Button>
                      {!order.is_refund_or_cancelled && isPendingShippingStatus(order.shipping_status) ? <MarkShippedForm orderId={order.id} /> : null}
                    </div>
                  </td>
                </tr>
              ))
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
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
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

function formatPaymentStatus(paymentStatus: string, depositAmount: number) {
  if (paymentStatus === "定金") return `定金 ${depositAmount > 0 ? formatRmb(depositAmount) : ""}`.trim();
  return "已付全款";
}
