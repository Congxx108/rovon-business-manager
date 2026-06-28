import {
  DAILY_LEAD_CSV_FIELD_ALIASES,
  ORDER_CSV_FIELD_ALIASES,
  getCsvValue,
  normalizeContactInput,
  parseDateInput,
  parseNumberInput,
  type CsvRecord,
} from "@/lib/csv";
import { PAYMENT_CURRENCIES, RMB_PAYMENT_METHODS, suggestPaymentCurrency } from "@/lib/payment";
import { normalizeShippingMethod, normalizeShippingStatus } from "@/lib/shipping";

export type ParsedOrderImportRow = {
  rowNumber: number;
  order_date: string;
  contact: string | null;
  customer_name: string | null;
  sales_amount_rmb: number;
  quantity: number;
  remark: string | null;
  order_no: string;
  country: string | null;
  product_line: string | null;
  shipping_status: string;
  shipping_method: string | null;
  shipping_company: string | null;
  tracking_no: string | null;
  shipping_date: string | null;
  shipping_remark: string | null;
  payment_currency: string | null;
  rmb_payment_method: string | null;
  payment_remark: string | null;
  contactWarning: string | null;
  errors: string[];
};

export type ParsedDailyLeadImportRow = {
  rowNumber: number;
  stat_date: string;
  facebook_leads: number;
  whatsapp1: number;
  whatsapp2: number;
  handbag_group: number;
  backpack_group: number;
  csv_total_increase: number | null;
  csv_handbag_group_increase: number | null;
  csv_backpack_group_increase: number | null;
  errors: string[];
};

export function mapOrderImportRows(records: CsvRecord[], defaults: { country?: string; productLine?: string }) {
  const importDate = new Date().toISOString().slice(0, 10).replaceAll("-", "");

  return records.map((record, index): ParsedOrderImportRow => {
    const rowNumber = index + 2;
    const dateRaw = getCsvValue(record, ORDER_CSV_FIELD_ALIASES.order_date);
    const contactRaw = getCsvValue(record, ORDER_CSV_FIELD_ALIASES.contact);
    const contactResult = normalizeContactInput(contactRaw);
    const contact = cleanText(contactResult.value);
    const customerName = cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.customer_name));
    const salesRaw = getCsvValue(record, ORDER_CSV_FIELD_ALIASES.sales_amount_rmb);
    const quantityRaw = getCsvValue(record, ORDER_CSV_FIELD_ALIASES.quantity);
    const remark = cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.remark));
    const csvOrderNo = cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.order_no));
    const country = cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.country)) ?? cleanText(defaults.country ?? "");
    const productLine = cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.product_line)) ?? cleanText(defaults.productLine ?? "");
    const shippingStatus = normalizeShippingStatus(cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.shipping_status)));
    const shippingMethod = normalizeShippingMethod(cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.shipping_method)));
    const shippingCompany = cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.shipping_company));
    const trackingNo = cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.tracking_no));
    const shippingRemark = cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.shipping_remark));
    const paymentCurrency = normalizeOption(
      cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.payment_currency)) ?? suggestPaymentCurrency(country),
      PAYMENT_CURRENCIES,
    );
    const rmbPaymentMethod = paymentCurrency === "RMB"
      ? normalizeOption(cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.rmb_payment_method)), RMB_PAYMENT_METHODS)
      : null;
    const paymentRemark = cleanText(getCsvValue(record, ORDER_CSV_FIELD_ALIASES.payment_remark));
    const orderDate = parseDateInput(dateRaw);
    const shippingDateRaw = getCsvValue(record, ORDER_CSV_FIELD_ALIASES.shipping_date);
    const shippingDate = shippingDateRaw.trim() ? parseDateInput(shippingDateRaw) : { value: "", valid: true };
    const sales = parseNumberInput(salesRaw);
    const quantity = parseNumberInput(quantityRaw);
    const errors: string[] = [];
    const contactWarning = contactResult.usedScientificNotation
      ? "检测到科学计数法号码，可能已被 Excel 改写。"
      : null;

    if (!orderDate.valid) errors.push("订单日期无法解析");
    if (!customerName && !contact) errors.push("客户名和联系方式至少需要一个");
    if (!sales.valid) errors.push("销售额不是数字");
    if (!quantity.valid) errors.push("数量不是数字");
    if (sales.valid && sales.value < 0) errors.push("销售额不能小于 0");
    if (quantity.valid && quantity.value < 0) errors.push("数量不能小于 0");
    if (!country) errors.push("缺少国家/渠道");
    if (!productLine) errors.push("缺少产品线");
    if (!shippingDate.valid) errors.push("发货日期无法解析");

    return {
      rowNumber,
      order_date: orderDate.value,
      contact,
      customer_name: customerName,
      sales_amount_rmb: sales.value,
      quantity: quantity.value,
      remark,
      order_no: csvOrderNo ?? `IMPORT-${importDate}-${String(rowNumber).padStart(4, "0")}`,
      country,
      product_line: productLine,
      shipping_status: shippingStatus,
      shipping_method: shippingMethod,
      shipping_company: shippingCompany,
      tracking_no: trackingNo,
      shipping_date: shippingDate.value || null,
      shipping_remark: shippingRemark,
      payment_currency: paymentCurrency,
      rmb_payment_method: rmbPaymentMethod,
      payment_remark: paymentRemark,
      contactWarning,
      errors,
    };
  });
}

export function mapDailyLeadImportRows(records: CsvRecord[]) {
  return records.map((record, index): ParsedDailyLeadImportRow => {
    const rowNumber = index + 2;
    const statDate = parseDateInput(getCsvValue(record, DAILY_LEAD_CSV_FIELD_ALIASES.stat_date));
    const facebook = parseNumberInput(getCsvValue(record, DAILY_LEAD_CSV_FIELD_ALIASES.facebook_leads));
    const whatsapp1 = parseNumberInput(getCsvValue(record, DAILY_LEAD_CSV_FIELD_ALIASES.whatsapp1));
    const whatsapp2 = parseNumberInput(getCsvValue(record, DAILY_LEAD_CSV_FIELD_ALIASES.whatsapp2));
    const handbag = parseNumberInput(getCsvValue(record, DAILY_LEAD_CSV_FIELD_ALIASES.handbag_group));
    const backpack = parseNumberInput(getCsvValue(record, DAILY_LEAD_CSV_FIELD_ALIASES.backpack_group));
    const csvTotal = optionalNumber(getCsvValue(record, DAILY_LEAD_CSV_FIELD_ALIASES.total_increase));
    const csvHandbag = optionalNumber(getCsvValue(record, DAILY_LEAD_CSV_FIELD_ALIASES.handbag_group_increase));
    const csvBackpack = optionalNumber(getCsvValue(record, DAILY_LEAD_CSV_FIELD_ALIASES.backpack_group_increase));
    const errors: string[] = [];

    if (!statDate.valid) errors.push("日期无法解析");
    for (const [label, result] of [
      ["Facebook后台潜在客户", facebook],
      ["WhatsApp1", whatsapp1],
      ["WhatsApp2", whatsapp2],
      ["女包群", handbag],
      ["双肩包群", backpack],
    ] as const) {
      if (!result.valid) errors.push(`${label}不是数字`);
      if (result.valid && result.value < 0) errors.push(`${label}不能小于 0`);
    }

    return {
      rowNumber,
      stat_date: statDate.value,
      facebook_leads: facebook.value,
      whatsapp1: whatsapp1.value,
      whatsapp2: whatsapp2.value,
      handbag_group: handbag.value,
      backpack_group: backpack.value,
      csv_total_increase: csvTotal,
      csv_handbag_group_increase: csvHandbag,
      csv_backpack_group_increase: csvBackpack,
      errors,
    };
  });
}

export function orderImportSummary(rows: ParsedOrderImportRow[]) {
  const validRows = rows.filter((row) => row.errors.length === 0);
  return {
    totalRows: rows.length,
    validRows: validRows.length,
    errorRows: rows.length - validRows.length,
    salesTotal: validRows.reduce((sum, row) => sum + row.sales_amount_rmb, 0),
    quantityTotal: validRows.reduce((sum, row) => sum + row.quantity, 0),
  };
}

export function dailyLeadImportSummary(rows: ParsedDailyLeadImportRow[]) {
  const validRows = rows.filter((row) => row.errors.length === 0);
  return {
    totalRows: rows.length,
    validRows: validRows.length,
    errorRows: rows.length - validRows.length,
  };
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = parseNumberInput(value);
  return parsed.valid ? parsed.value : null;
}

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeOption<T extends readonly string[]>(value: string | null, options: T) {
  if (!value) return null;
  return options.includes(value) ? value : "其他";
}
