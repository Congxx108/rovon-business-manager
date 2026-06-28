import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ShippingStatusBadge } from "@/components/shipping-status-badge";
import { StatusNote } from "@/components/status-note";
import { Badge, Button, EmptyState, tableHeadClassName, tableRowClassName, tableShellClassName } from "@/components/ui";
import { getCustomerById, getOrdersForCustomer } from "@/lib/data";
import { formatDate, formatNumber, formatRmb } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerResult = await getCustomerById(id);
  const customer = customerResult.data;
  if (!customer) notFound();

  const ordersResult = await getOrdersForCustomer(customer);

  return (
    <AppShell>
      <PageHeader title={customer.name} description="客户完整信息、跟进信息和按稳定规则匹配到的历史订单。" />
      <StatusNote configured={customerResult.configured} error={customerResult.error ?? ordersResult.error} />

      <div className="mb-5 flex gap-3">
        <Button href={`/customers/${customer.id}/edit`}>跟进/编辑</Button>
        <Button href="/customers" variant="secondary">返回客户列表</Button>
      </div>

      <section className="grid gap-5 lg:grid-cols-3">
        <InfoPanel
          title="基础信息"
          items={[
            ["联系方式", customer.contact ?? "-"],
            ["国家/渠道", customer.country ?? "-"],
            ["主要产品线", customer.main_product_line ?? "-"],
            ["首单日期", formatDate(customer.first_order_date)],
            ["最近下单日期", formatDate(customer.last_order_date)],
          ]}
        />
        <InfoPanel
          title="自动统计"
          items={[
            ["历史订单数", formatNumber(customer.total_orders)],
            ["历史购买总数量", formatNumber(customer.total_quantity)],
            ["历史销售额RMB", formatRmb(Number(customer.total_sales_rmb ?? 0))],
            ["复购状态", customer.repurchase_status],
            ["客户价值等级", customer.customer_value_level],
            ["客户复购潜力", customer.repurchase_potential],
          ]}
        />
        <InfoPanel
          title="跟进信息"
          items={[
            ["跟进优先级", customer.follow_priority],
            ["建议跟进动作", customer.follow_suggestion ?? "-"],
            ["最后跟进日期", formatDate(customer.last_follow_date)],
            ["最后跟进结果", customer.last_follow_result ?? "-"],
            ["下次联系日期", formatDate(customer.next_follow_date)],
            ["备注", customer.remark ?? "-"],
          ]}
        />
      </section>

      <section className="mt-6 rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50">
        <h2 className="text-base font-semibold">历史订单列表</h2>
        <p className="mt-1 text-sm text-slate-500">
          匹配规则：有联系方式时按联系方式匹配；没有联系方式时按客户名 + 国家/渠道匹配。
        </p>
        {ordersResult.data.length ? (
        <div className={`mt-4 ${tableShellClassName}`}>
          <table className="w-full min-w-[1500px] table-fixed text-left text-sm [&_td]:whitespace-nowrap">
            <colgroup>
              <col className="w-[90px]" />
              <col className="w-[130px]" />
              <col className="w-[100px]" />
              <col className="w-[90px]" />
              <col className="w-[80px]" />
              <col className="w-[120px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
              <col className="w-[90px]" />
              <col className="w-[130px]" />
              <col className="w-[150px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
            </colgroup>
            <thead className={tableHeadClassName}>
              <tr>
                <th className="py-2 pr-4 font-medium">订单日期</th>
                <th className="py-2 pr-4 font-medium">订单编号</th>
                <th className="py-2 pr-4 font-medium">国家/渠道</th>
                <th className="py-2 pr-4 font-medium">产品线</th>
                <th className="py-2 pr-4 font-medium">数量</th>
                <th className="py-2 pr-4 font-medium">销售额RMB</th>
                <th className="py-2 pr-4 font-medium">订单状态</th>
                <th className="py-2 pr-4 font-medium">付款状态</th>
                <th className="py-2 pr-4 font-medium">发货状态</th>
                <th className="py-2 pr-4 font-medium">物流方式</th>
                <th className="py-2 pr-4 font-medium">物流/快运公司</th>
                <th className="py-2 pr-4 font-medium">物流单号/货运单号</th>
                <th className="py-2 pr-4 font-medium">发货日期</th>
                <th className="py-2 pr-4 font-medium">取消/退款</th>
              </tr>
            </thead>
            <tbody>
                {ordersResult.data.map((order) => (
                  <tr key={order.id} className={tableRowClassName}>
                    <td className="py-3 pr-4">{formatDate(order.order_date)}</td>
                    <td className="truncate py-3 pr-4 font-medium" title={order.order_no}>{order.order_no}</td>
                    <td className="truncate py-3 pr-4" title={order.country ?? ""}>{order.country ?? "-"}</td>
                    <td className="truncate py-3 pr-4" title={order.product_line ?? ""}>{order.product_line ?? "-"}</td>
                    <td className="py-3 pr-4 text-right">{formatNumber(order.quantity)}</td>
                    <td className="py-3 pr-4 text-right font-medium">{formatRmb(Number(order.sales_amount_rmb ?? 0))}</td>
                    <td className="py-3 pr-4">{order.order_status}</td>
                    <td className="py-3 pr-4">{formatPaymentStatus(order.payment_status, Number(order.deposit_amount_rmb ?? 0), order.payment_currency)}</td>
                    <td className="py-3 pr-4"><ShippingStatusBadge value={order.shipping_status} /></td>
                    <td className="truncate py-3 pr-4" title={order.shipping_method ?? ""}>{order.shipping_method ?? "-"}</td>
                    <td className="truncate py-3 pr-4" title={order.shipping_company ?? ""}>{order.shipping_company ?? "-"}</td>
                    <td className="truncate py-3 pr-4" title={order.tracking_no ?? ""}>{order.tracking_no ?? "-"}</td>
                    <td className="py-3 pr-4">{formatDate(order.shipping_date)}</td>
                    <td className="py-3 pr-4">{order.is_refund_or_cancelled ? <Badge tone="danger">取消/退款</Badge> : "-"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="mt-4">
            <EmptyState message="暂无匹配订单" />
          </div>
        )}
      </section>
    </AppShell>
  );
}

function InfoPanel({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map(([label, value]) => (
          <div key={label} className="border-b border-slate-100 pb-2">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-1 text-sm font-medium text-slate-950">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatPaymentStatus(paymentStatus: string, depositAmount: number, paymentCurrency?: string | null) {
  const status = paymentStatus === "定金" ? `定金 ${depositAmount > 0 ? formatRmb(depositAmount) : ""}`.trim() : "已付全款";
  return paymentCurrency ? `${status} / ${paymentCurrency}` : status;
}
