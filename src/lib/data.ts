import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { PENDING_SHIPPING_STATUSES, SHIPPING_STATUSES } from "@/lib/shipping";
import type { Customer, DailyLead, Order } from "@/lib/types";

export type DataResult<T> = {
  data: T;
  configured: boolean;
  error?: string;
};

const emptyResult = <T>(data: T, error?: string): DataResult<T> => ({
  data,
  configured: isSupabaseConfigured(),
  error,
});

export type OrderFilters = {
  country?: string;
  productLine?: string;
  month?: string;
  shippingStatus?: string;
  pendingShipping?: string;
  search?: string;
};

export type OrderFilterOptions = {
  countries: string[];
  productLines: string[];
  months: string[];
  shippingStatuses: string[];
};

function cleanFilter(value?: string) {
  return value && value.trim() ? value.trim() : undefined;
}

export async function getOrders(filters: OrderFilters = {}, limit = 200, offset = 0): Promise<DataResult<Order[]>> {
  if (!isSupabaseConfigured()) return emptyResult([]);

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("orders")
    .select("*")
    .order("order_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const country = cleanFilter(filters.country);
  const productLine = cleanFilter(filters.productLine);
  const month = cleanFilter(filters.month);
  const shippingStatus = cleanFilter(filters.shippingStatus);
  const pendingShipping = cleanFilter(filters.pendingShipping);
  const search = cleanFilter(filters.search);

  if (country) query = query.eq("country", country);
  if (productLine) query = query.eq("product_line", productLine);
  if (shippingStatus) query = query.eq("shipping_status", shippingStatus);
  if (pendingShipping === "1") {
    query = query.eq("is_refund_or_cancelled", false).in("shipping_status", [...PENDING_SHIPPING_STATUSES]);
  }
  if (month) {
    query = query.gte("order_date", `${month}-01`).lt("order_date", nextMonth(month));
  }
  if (search) {
    const escaped = escapeLike(search);
    query = query.or(`customer_name.ilike.%${escaped}%,contact.ilike.%${escaped}%,order_no.ilike.%${escaped}%`);
  }

  const { data, error } = await query;

  if (error) return emptyResult([], error.message);
  return emptyResult((data ?? []) as Order[]);
}

export async function getOrderById(id: string): Promise<DataResult<Order | null>> {
  if (!isSupabaseConfigured()) return emptyResult(null);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).single();

  if (error) return emptyResult(null, error.message);
  return emptyResult(data as Order);
}

export async function getOrderFilterOptions(): Promise<DataResult<OrderFilterOptions>> {
  const fallback: OrderFilterOptions = { countries: [], productLines: [], months: [], shippingStatuses: [...SHIPPING_STATUSES] };
  if (!isSupabaseConfigured()) return emptyResult(fallback);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("orders").select("country,product_line,order_date");

  if (error) return emptyResult(fallback, error.message);

  const countries = new Set<string>();
  const productLines = new Set<string>();
  const months = new Set<string>();

  for (const order of data ?? []) {
    if (order.country) countries.add(order.country);
    if (order.product_line) productLines.add(order.product_line);
    if (order.order_date) months.add(order.order_date.slice(0, 7));
  }

  return emptyResult({
    countries: Array.from(countries).sort(),
    productLines: Array.from(productLines).sort(),
    months: Array.from(months).sort().reverse(),
    shippingStatuses: [...SHIPPING_STATUSES],
  });
}

export type CustomerFilters = {
  followPriority?: string;
  valueLevel?: string;
  country?: string;
  search?: string;
};

export type CustomerFilterOptions = {
  followPriorities: string[];
  valueLevels: string[];
  countries: string[];
};

export async function getCustomers(filters: CustomerFilters = {}, limit = 200): Promise<DataResult<Customer[]>> {
  if (!isSupabaseConfigured()) return emptyResult([]);

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("customers")
    .select("*")
    .order("total_sales_rmb", { ascending: false })
    .limit(limit);

  const followPriority = cleanFilter(filters.followPriority);
  const valueLevel = cleanFilter(filters.valueLevel);
  const country = cleanFilter(filters.country);
  const search = cleanFilter(filters.search);

  if (followPriority) query = query.eq("follow_priority", followPriority);
  if (valueLevel) query = query.eq("customer_value_level", valueLevel);
  if (country) query = query.eq("country", country);
  if (search) {
    const escaped = escapeLike(search);
    query = query.or(`name.ilike.%${escaped}%,contact.ilike.%${escaped}%`);
  }

  const { data, error } = await query;

  if (error) return emptyResult([], error.message);
  return emptyResult((data ?? []) as Customer[]);
}

export async function getCustomerFilterOptions(): Promise<DataResult<CustomerFilterOptions>> {
  const fallback: CustomerFilterOptions = { followPriorities: [], valueLevels: [], countries: [] };
  if (!isSupabaseConfigured()) return emptyResult(fallback);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("customers").select("follow_priority,customer_value_level,country");

  if (error) return emptyResult(fallback, error.message);

  const followPriorities = new Set<string>();
  const valueLevels = new Set<string>();
  const countries = new Set<string>();

  for (const customer of data ?? []) {
    if (customer.follow_priority) followPriorities.add(customer.follow_priority);
    if (customer.customer_value_level) valueLevels.add(customer.customer_value_level);
    if (customer.country) countries.add(customer.country);
  }

  return emptyResult({
    followPriorities: Array.from(followPriorities).sort(),
    valueLevels: Array.from(valueLevels).sort(),
    countries: Array.from(countries).sort(),
  });
}

export async function getCustomerById(id: string): Promise<DataResult<Customer | null>> {
  if (!isSupabaseConfigured()) return emptyResult(null);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();

  if (error) return emptyResult(null, error.message);
  return emptyResult(data as Customer);
}

export async function getOrdersForCustomer(customer: Customer): Promise<DataResult<Order[]>> {
  if (!isSupabaseConfigured()) return emptyResult([]);

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("orders")
    .select("*")
    .order("order_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (customer.contact?.trim()) {
    query = query.eq("contact", customer.contact);
  } else {
    query = query.eq("customer_name", customer.name);
    if (customer.country?.trim()) query = query.eq("country", customer.country);
  }

  const { data, error } = await query;
  if (error) return emptyResult([], error.message);
  return emptyResult((data ?? []) as Order[]);
}

export async function getDailyLeads(limit = 60): Promise<DataResult<DailyLead[]>> {
  if (!isSupabaseConfigured()) return emptyResult([]);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_leads")
    .select("*")
    .order("stat_date", { ascending: false })
    .limit(limit);

  if (error) return emptyResult([], error.message);
  return emptyResult((data ?? []) as DailyLead[]);
}

export async function getDailyLeadById(id: string): Promise<DataResult<DailyLead | null>> {
  if (!isSupabaseConfigured()) return emptyResult(null);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("daily_leads").select("*").eq("id", id).single();

  if (error) return emptyResult(null, error.message);
  return emptyResult(data as DailyLead);
}

export type DashboardData = {
  totalSalesRmb: number;
  totalOrders: number;
  totalQuantity: number;
  averageOrderAmountRmb: number;
  monthlySales: Array<{ month: string; sales: number; quantity: number }>;
  countrySales: Array<{ country: string; sales: number; quantity: number }>;
  recentLeads: DailyLead[];
  followCustomers: Pick<
    Customer,
    "id" | "name" | "country" | "total_sales_rmb" | "last_order_date" | "days_since_last_order" | "follow_priority" | "follow_suggestion"
  >[];
  pendingShipping: {
    count: number;
    salesTotal: number;
    quantityTotal: number;
    orders: Pick<
      Order,
      | "id"
      | "order_no"
      | "order_date"
      | "customer_name"
      | "country"
      | "product_line"
      | "quantity"
      | "sales_amount_rmb"
      | "sales_amount_effective_rmb"
      | "shipping_status"
      | "shipping_method"
    >[];
  };
};

export type DashboardRange = "all" | "month" | "30" | "90" | "year";

export async function getDashboardData(range: DashboardRange = "all"): Promise<DataResult<DashboardData>> {
  const fallback: DashboardData = {
    totalSalesRmb: 0,
    totalOrders: 0,
    totalQuantity: 0,
    averageOrderAmountRmb: 0,
    monthlySales: [],
    countrySales: [],
    recentLeads: [],
    followCustomers: [],
    pendingShipping: {
      count: 0,
      salesTotal: 0,
      quantityTotal: 0,
      orders: [],
    },
  };

  if (!isSupabaseConfigured()) return emptyResult(fallback);

  const supabase = getSupabaseAdminClient();
  const startDate = dashboardRangeStartDate(range);
  let ordersQuery = supabase
    .from("orders")
    .select("order_date,country,product_line,quantity,sales_amount_effective_rmb,is_refund_or_cancelled")
    .eq("is_refund_or_cancelled", false);
  let leadsQuery = supabase
    .from("daily_leads")
    .select("stat_date,total_increase,handbag_group_increase,backpack_group_increase")
    .order("stat_date", { ascending: false })
    .limit(90);

  if (startDate) {
    ordersQuery = ordersQuery.gte("order_date", startDate);
    leadsQuery = leadsQuery.gte("stat_date", startDate);
  }

  const [ordersResult, leadsResult, customersResult, pendingShippingResult] = await Promise.all([
    ordersQuery,
    leadsQuery,
    supabase
      .from("customers")
      .select("id,name,country,total_sales_rmb,last_order_date,days_since_last_order,follow_priority,follow_suggestion")
      .in("follow_priority", ["优先跟进", "可跟进"])
      .order("total_sales_rmb", { ascending: false })
      .limit(10),
    supabase
      .from("orders")
      .select("id,order_no,order_date,customer_name,country,product_line,quantity,sales_amount_rmb,sales_amount_effective_rmb,shipping_status,shipping_method")
      .eq("is_refund_or_cancelled", false)
      .in("shipping_status", [...PENDING_SHIPPING_STATUSES])
      .order("order_date", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (ordersResult.error || leadsResult.error || customersResult.error || pendingShippingResult.error) {
    return emptyResult(
      fallback,
      ordersResult.error?.message ?? leadsResult.error?.message ?? customersResult.error?.message ?? pendingShippingResult.error?.message,
    );
  }

  const orders = (ordersResult.data ?? []) as Pick<
    Order,
    "order_date" | "country" | "product_line" | "quantity" | "sales_amount_effective_rmb" | "is_refund_or_cancelled"
  >[];
  const recentLeads = (leadsResult.data ?? []) as DailyLead[];
  const followCustomers = (customersResult.data ?? []) as DashboardData["followCustomers"];
  const pendingOrders = (pendingShippingResult.data ?? []) as DashboardData["pendingShipping"]["orders"];

  const monthlyMap = new Map<string, { month: string; sales: number; quantity: number }>();
  const countryMap = new Map<string, { country: string; sales: number; quantity: number }>();

  for (const order of orders) {
    const sales = Number(order.sales_amount_effective_rmb ?? 0);
    const quantity = Number(order.quantity ?? 0);
    const month = order.order_date?.slice(0, 7) || "未填写";
    const country = order.country || "未填写";

    monthlyMap.set(month, {
      month,
      sales: (monthlyMap.get(month)?.sales ?? 0) + sales,
      quantity: (monthlyMap.get(month)?.quantity ?? 0) + quantity,
    });

    countryMap.set(country, {
      country,
      sales: (countryMap.get(country)?.sales ?? 0) + sales,
      quantity: (countryMap.get(country)?.quantity ?? 0) + quantity,
    });
  }

  const totalSalesRmb = orders.reduce((sum, order) => sum + Number(order.sales_amount_effective_rmb ?? 0), 0);
  const totalOrders = orders.length;
  const totalQuantity = orders.reduce((sum, order) => sum + Number(order.quantity ?? 0), 0);
  const pendingShipping = {
    count: pendingOrders.length,
    salesTotal: pendingOrders.reduce((sum, order) => sum + Number(order.sales_amount_effective_rmb ?? order.sales_amount_rmb ?? 0), 0),
    quantityTotal: pendingOrders.reduce((sum, order) => sum + Number(order.quantity ?? 0), 0),
    orders: pendingOrders.slice(0, 10),
  };

  return emptyResult({
    totalSalesRmb,
    totalOrders,
    totalQuantity,
    averageOrderAmountRmb: totalOrders > 0 ? totalSalesRmb / totalOrders : 0,
    monthlySales: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
    countrySales: Array.from(countryMap.values()).sort((a, b) => b.sales - a.sales),
    recentLeads: recentLeads.reverse(),
    followCustomers,
    pendingShipping,
  });
}

export type DataCheckData = {
  orders: Array<{ label: string; value: number; severity: "ok" | "warn" | "error" }>;
  customers: Array<{ label: string; value: number; severity: "ok" | "warn" | "error" }>;
  dailyLeads: Array<{ label: string; value: number; severity: "ok" | "warn" | "error" }>;
  shipping: Array<{ label: string; value: number; severity: "ok" | "warn" | "error"; kind?: "number" | "money" }>;
  importReview: ImportReviewData;
};

export async function getDataCheckData(): Promise<DataResult<DataCheckData>> {
  const fallback: DataCheckData = { orders: [], customers: [], dailyLeads: [], shipping: [], importReview: emptyImportReviewData() };
  if (!isSupabaseConfigured()) return emptyResult(fallback);

  const supabase = getSupabaseAdminClient();
  const [ordersResult, customersResult, leadsResult] = await Promise.all([
    supabase
      .from("orders")
      .select("order_no,order_date,country,product_line,sales_amount_rmb,sales_amount_effective_rmb,quantity,customer_name,contact,is_refund_or_cancelled,shipping_status,shipping_method,shipping_company,tracking_no,shipping_date"),
    supabase.from("customers").select("name,contact,country,total_sales_rmb,repurchase_status,repurchase_potential,follow_priority,last_order_date"),
    supabase
      .from("daily_leads")
      .select("stat_date,facebook_leads,whatsapp1,whatsapp2,handbag_group,backpack_group,total_increase,handbag_group_increase,backpack_group_increase,total_increase_override,handbag_group_increase_override,backpack_group_increase_override,is_handbag_group_reset,is_backpack_group_reset"),
  ]);

  if (ordersResult.error || customersResult.error || leadsResult.error) {
    return emptyResult(fallback, ordersResult.error?.message ?? customersResult.error?.message ?? leadsResult.error?.message);
  }

  const orders = ordersResult.data ?? [];
  const customers = customersResult.data ?? [];
  const leads = ((leadsResult.data ?? []) as Partial<DailyLead>[]).sort((a, b) => String(a.stat_date ?? "").localeCompare(String(b.stat_date ?? "")));
  const leadDates = new Map<string, number>();
  for (const lead of leads) {
    if (lead.stat_date) leadDates.set(lead.stat_date, (leadDates.get(lead.stat_date) ?? 0) + 1);
  }
  const validOrders = orders.filter((order) => !order.is_refund_or_cancelled);
  const pendingShippingOrders = orders.filter(
    (order) => !order.is_refund_or_cancelled && PENDING_SHIPPING_STATUSES.includes((order.shipping_status ?? "未发货") as (typeof PENDING_SHIPPING_STATUSES)[number]),
  );
  const shippedOrders = orders.filter((order) => order.shipping_status === "已发货");
  const topCustomers = [...customers]
    .sort((a, b) => Number(b.total_sales_rmb ?? 0) - Number(a.total_sales_rmb ?? 0))
    .slice(0, 10)
    .map((customer) => ({
      name: customer.name ?? "未命名客户",
      contact: customer.contact ?? "",
      country: customer.country ?? "",
      totalSalesRmb: Number(customer.total_sales_rmb ?? 0),
    }));

  return emptyResult({
    orders: [
      metric("缺少订单日期的订单数量", orders.filter((order) => !order.order_date).length, "error"),
      metric("订单编号重复数量", duplicateCount(orders.map((order) => order.order_no).filter(Boolean)), "error"),
      metric("缺少国家/渠道的订单数量", orders.filter((order) => !order.country).length, "error"),
      metric("缺少产品线的订单数量", orders.filter((order) => !order.product_line).length, "error"),
      metric("销售额为空或小于等于 0 的订单数量", orders.filter((order) => order.sales_amount_rmb === null || Number(order.sales_amount_rmb) <= 0).length, "error"),
      metric("数量为空或小于等于 0 的订单数量", orders.filter((order) => order.quantity === null || Number(order.quantity) <= 0).length, "error"),
      metric(
        "有销售额但没有客户名和联系方式的订单数量",
        orders.filter((order) => Number(order.sales_amount_rmb ?? 0) > 0 && !order.customer_name && !order.contact).length,
        "error",
      ),
    ],
    customers: [
      metric("客户总数", customers.length, "ok"),
      metric("已复购客户数", customers.filter((customer) => customer.repurchase_status === "已复购").length, "ok"),
      metric("优先跟进客户数", customers.filter((customer) => customer.follow_priority === "优先跟进").length, "warn"),
      metric("可跟进客户数", customers.filter((customer) => customer.follow_priority === "可跟进").length, "warn"),
      metric("最近下单日期为空的客户数", customers.filter((customer) => !customer.last_order_date).length, "warn"),
    ],
    dailyLeads: [
      metric("总记录数", leads.length, "ok"),
      metric("日期重复记录数", Array.from(leadDates.values()).filter((count) => count > 1).length, "error"),
      metric(
        "三个累计字段为空的记录数",
        leads.filter((lead) => lead.facebook_leads === null || lead.whatsapp1 === null || lead.whatsapp2 === null).length,
        "error",
      ),
      metric(
        "群人数为空的记录数",
        leads.filter((lead) => lead.handbag_group === null || lead.backpack_group === null).length,
        "error",
      ),
      metric(
        "增加数为负数的提示记录数",
        leads.filter((lead) => Number(lead.total_increase) < 0 || Number(lead.handbag_group_increase) < 0 || Number(lead.backpack_group_increase) < 0).length,
        "warn",
      ),
      metric(
        "手动修正记录数量",
        leads.filter(
          (lead) =>
            lead.total_increase_override != null ||
            lead.handbag_group_increase_override != null ||
            lead.backpack_group_increase_override != null,
        ).length,
        "ok",
      ),
      metric("女包换群/重置记录数量", leads.filter((lead) => lead.is_handbag_group_reset).length, "ok"),
      metric("双肩包换群/重置记录数量", leads.filter((lead) => lead.is_backpack_group_reset).length, "ok"),
    ],
    shipping: [
      { label: "待发货订单数量", value: pendingShippingOrders.length, kind: "number", severity: pendingShippingOrders.length > 0 ? "warn" : "ok" },
      {
        label: "待发货订单总金额",
        value: pendingShippingOrders.reduce((sum, order) => sum + Number(order.sales_amount_effective_rmb ?? order.sales_amount_rmb ?? 0), 0),
        kind: "money",
        severity: pendingShippingOrders.length > 0 ? "warn" : "ok",
      },
      {
        label: "已发货但没有物流单号的订单数量",
        value: shippedOrders.filter((order) => !order.tracking_no).length,
        kind: "number",
        severity: shippedOrders.some((order) => !order.tracking_no) ? "warn" : "ok",
      },
      {
        label: "已发货但没有发货日期的订单数量",
        value: shippedOrders.filter((order) => !order.shipping_date).length,
        kind: "number",
        severity: shippedOrders.some((order) => !order.shipping_date) ? "warn" : "ok",
      },
      {
        label: "部分发货订单数量",
        value: orders.filter((order) => order.shipping_status === "部分发货").length,
        kind: "number",
        severity: orders.some((order) => order.shipping_status === "部分发货") ? "warn" : "ok",
      },
      {
        label: "备货中订单数量",
        value: orders.filter((order) => order.shipping_status === "备货中").length,
        kind: "number",
        severity: orders.some((order) => order.shipping_status === "备货中") ? "warn" : "ok",
      },
      {
        label: "取消/退款但仍标记为未发货的订单数量",
        value: orders.filter((order) => order.is_refund_or_cancelled && order.shipping_status === "未发货").length,
        kind: "number",
        severity: orders.some((order) => order.is_refund_or_cancelled && order.shipping_status === "未发货") ? "warn" : "ok",
      },
    ],
    importReview: {
      orderSummary: [
        { label: "订单总数", value: orders.length, kind: "number" },
        { label: "有效订单数", value: validOrders.length, kind: "number" },
        { label: "取消/退款订单数", value: orders.length - validOrders.length, kind: "number" },
        {
          label: "销售额合计",
          value: validOrders.reduce((sum, order) => sum + Number(order.sales_amount_effective_rmb ?? order.sales_amount_rmb ?? 0), 0),
          kind: "money",
        },
        { label: "数量合计", value: validOrders.reduce((sum, order) => sum + Number(order.quantity ?? 0), 0), kind: "number" },
        { label: "国家数量", value: new Set(orders.map((order) => order.country).filter(Boolean)).size, kind: "number" },
        { label: "客户名或联系方式缺失的订单数量", value: orders.filter((order) => !order.customer_name || !order.contact).length, kind: "number" },
        { label: "国家/渠道缺失数量", value: orders.filter((order) => !order.country).length, kind: "number" },
        { label: "产品线缺失数量", value: orders.filter((order) => !order.product_line).length, kind: "number" },
      ],
      customerSummary: [
        { label: "客户总数", value: customers.length, kind: "number" },
        { label: "已复购客户数", value: customers.filter((customer) => customer.repurchase_status === "已复购").length, kind: "number" },
        { label: "高潜力客户数", value: customers.filter((customer) => customer.repurchase_potential === "高潜力").length, kind: "number" },
        { label: "优先跟进客户数", value: customers.filter((customer) => customer.follow_priority === "优先跟进").length, kind: "number" },
        { label: "可跟进客户数", value: customers.filter((customer) => customer.follow_priority === "可跟进").length, kind: "number" },
      ],
      topCustomers,
      dailyLeadSummary: [
        { label: "记录总数", value: leads.length, kind: "number" },
        { label: "日期范围", value: leads.length ? `${leads[0]?.stat_date} - ${leads[leads.length - 1]?.stat_date}` : "-", kind: "text" },
        { label: "总增加数合计", value: leads.reduce((sum, lead) => sum + Number(lead.total_increase ?? 0), 0), kind: "number" },
        { label: "女包群增加数合计", value: leads.reduce((sum, lead) => sum + Number(lead.handbag_group_increase ?? 0), 0), kind: "number" },
        { label: "双肩包群增加数合计", value: leads.reduce((sum, lead) => sum + Number(lead.backpack_group_increase ?? 0), 0), kind: "number" },
      ],
      recentDailyLeads: [...leads].reverse().slice(0, 7).map((lead) => ({
        statDate: lead.stat_date ?? "",
        facebookLeads: Number(lead.facebook_leads ?? 0),
        whatsapp1: Number(lead.whatsapp1 ?? 0),
        whatsapp2: Number(lead.whatsapp2 ?? 0),
        totalIncrease: Number(lead.total_increase ?? 0),
        handbagGroup: Number(lead.handbag_group ?? 0),
        handbagGroupIncrease: Number(lead.handbag_group_increase ?? 0),
        backpackGroup: Number(lead.backpack_group ?? 0),
        backpackGroupIncrease: Number(lead.backpack_group_increase ?? 0),
      })),
    },
  });
}

export type ImportReviewMetric = {
  label: string;
  value: number | string;
  kind: "number" | "money" | "text";
};

export type ImportReviewData = {
  orderSummary: ImportReviewMetric[];
  customerSummary: ImportReviewMetric[];
  dailyLeadSummary: ImportReviewMetric[];
  topCustomers: Array<{ name: string; contact: string; country: string; totalSalesRmb: number }>;
  recentDailyLeads: Array<{
    statDate: string;
    facebookLeads: number;
    whatsapp1: number;
    whatsapp2: number;
    totalIncrease: number;
    handbagGroup: number;
    handbagGroupIncrease: number;
    backpackGroup: number;
    backpackGroupIncrease: number;
  }>;
};

export type DataCleanupPreview = {
  testOrders: Pick<Order, "id" | "order_no" | "order_date" | "customer_name" | "contact" | "country" | "sales_amount_rmb" | "remark">[];
  testDailyLeads: Pick<DailyLead, "id" | "stat_date" | "facebook_leads" | "whatsapp1" | "whatsapp2" | "handbag_group" | "backpack_group">[];
  affectedCustomerCount: number;
};

export async function getDataCleanupPreview(): Promise<DataResult<DataCleanupPreview>> {
  const fallback: DataCleanupPreview = { testOrders: [], testDailyLeads: [], affectedCustomerCount: 0 };
  if (!isSupabaseConfigured()) return emptyResult(fallback);

  const supabase = getSupabaseAdminClient();
  const [ordersResult, leadsResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id,order_no,order_date,customer_name,contact,country,sales_amount_rmb,remark")
      .or("order_no.like.TEST-%,order_no.like.IMPORT-%,customer_name.ilike.%Test%,remark.ilike.%测试%")
      .order("order_date", { ascending: false })
      .limit(200),
    supabase
      .from("daily_leads")
      .select("id,stat_date,facebook_leads,whatsapp1,whatsapp2,handbag_group,backpack_group")
      .gte("stat_date", "2026-06-25")
      .lte("stat_date", "2026-06-28")
      .order("stat_date", { ascending: false }),
  ]);

  if (ordersResult.error || leadsResult.error) {
    return emptyResult(fallback, ordersResult.error?.message ?? leadsResult.error?.message);
  }

  const testOrders = (ordersResult.data ?? []) as DataCleanupPreview["testOrders"];
  const testDailyLeads = (leadsResult.data ?? []) as DataCleanupPreview["testDailyLeads"];
  const customerKeys = new Set(
    testOrders
      .map((order) => order.contact?.trim() || `${order.customer_name ?? ""}|${order.country ?? ""}`)
      .filter((value) => value.trim() !== "|"),
  );

  return emptyResult({ testOrders, testDailyLeads, affectedCustomerCount: customerKeys.size });
}

function nextMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber, 1));
  return date.toISOString().slice(0, 10);
}

function dashboardRangeStartDate(range: DashboardRange) {
  const now = new Date();
  if (range === "all") return null;
  if (range === "month") return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  if (range === "year") return new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);
  const days = range === "90" ? 90 : 30;
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function escapeLike(value: string) {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}

function metric(label: string, value: number, warningSeverity: "ok" | "warn" | "error") {
  return {
    label,
    value,
    severity: value === 0 && warningSeverity !== "ok" ? "ok" : warningSeverity,
  };
}

function duplicateCount(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.values()).filter((count) => count > 1).length;
}

function emptyImportReviewData(): ImportReviewData {
  return {
    orderSummary: [],
    customerSummary: [],
    dailyLeadSummary: [],
    topCustomers: [],
    recentDailyLeads: [],
  };
}
