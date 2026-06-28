export type CsvRecord = Record<string, string>;

export type CsvEncoding = "UTF-8" | "GBK/GB18030";

export type CsvFieldAliases = Record<string, string[]>;

export type CsvMatchedField = {
  field: string;
  header: string;
};

export type CsvParseResult = {
  records: CsvRecord[];
  headers: string[];
  encoding: CsvEncoding;
  matchedFields: CsvMatchedField[];
  warnings: string[];
  error?: string;
};

export const ORDER_CSV_FIELD_ALIASES = {
  order_date: ["时间", "日期", "订单日期", "order_date"],
  contact: ["Whatsapp号码", "WhatsApp号码", "Whatsapp", "WhatsApp", "联系方式", "contact"],
  customer_name: ["姓名", "客户名", "客户", "customer_name"],
  sales_amount_rmb: ["销售额", "销售额RMB", "金额", "sales_amount", "sales_amount_rmb"],
  quantity: ["个数", "数量", "quantity"],
  remark: ["备注", "remark"],
  order_no: ["合同号", "订单编号", "order_no"],
  country: ["国家/渠道", "国家", "渠道", "country"],
  product_line: ["产品线", "product_line"],
  shipping_status: ["发货状态", "shipping_status"],
  shipping_method: ["物流方式", "shipping_method"],
  shipping_company: ["物流公司", "快运公司", "物流/快运公司", "shipping_company"],
  tracking_no: ["物流单号", "快运单号", "货运单号", "物流单号/货运单号", "tracking_no"],
  shipping_date: ["发货日期", "shipping_date"],
  shipping_remark: ["发货备注", "shipping_remark"],
} satisfies CsvFieldAliases;

export const ORDER_CSV_FIELD_LABELS: Record<keyof typeof ORDER_CSV_FIELD_ALIASES, string> = {
  order_date: "订单日期",
  contact: "联系方式",
  customer_name: "客户名",
  sales_amount_rmb: "销售额",
  quantity: "数量",
  remark: "备注",
  order_no: "订单编号",
  country: "国家/渠道",
  product_line: "产品线",
  shipping_status: "发货状态",
  shipping_method: "物流方式",
  shipping_company: "物流/快运公司",
  tracking_no: "物流单号/货运单号",
  shipping_date: "发货日期",
  shipping_remark: "发货备注",
};

export const DAILY_LEAD_CSV_FIELD_ALIASES = {
  stat_date: ["日期", "stat_date"],
  facebook_leads: ["客户", "Facebook后台潜在客户", "facebook_leads"],
  whatsapp1: ["WhatsApp1", "whatsapp1"],
  whatsapp2: ["WhatsApp2", "whatsapp2"],
  handbag_group: ["女包群", "handbag_group"],
  backpack_group: ["书包群人数", "双肩包群", "backpack_group"],
  total_increase: ["总增加数", "total_increase"],
  handbag_group_increase: ["增加数-女包群", "增加数女包群", "handbag_group_increase"],
  backpack_group_increase: ["增加数-双肩包群", "增加数双肩包群", "backpack_group_increase"],
} satisfies CsvFieldAliases;

export const DAILY_LEAD_CSV_FIELD_LABELS: Record<keyof typeof DAILY_LEAD_CSV_FIELD_ALIASES, string> = {
  stat_date: "日期",
  facebook_leads: "Facebook后台潜在客户",
  whatsapp1: "WhatsApp1",
  whatsapp2: "WhatsApp2",
  handbag_group: "女包群",
  backpack_group: "双肩包群",
  total_increase: "总增加数",
  handbag_group_increase: "增加数-女包群",
  backpack_group_increase: "增加数-双肩包群",
};

export async function parseCsvFile(file: File, aliases: CsvFieldAliases): Promise<CsvParseResult> {
  const buffer = await file.arrayBuffer();
  const utf8 = buildParseResult(decodeBuffer(buffer, "utf-8"), "UTF-8", aliases);
  const gbk = buildParseResult(decodeBuffer(buffer, "gb18030"), "GBK/GB18030", aliases);
  const utf8LooksGood = !hasReplacementCharacter(utf8.headers) && utf8.matchedFields.length > 0;

  if (utf8LooksGood) return utf8;
  if (gbk.matchedFields.length > 0) return gbk;
  if (utf8.matchedFields.length > 0) return utf8;

  return {
    ...utf8,
    error: "无法识别 CSV 表头，请将文件另存为 CSV UTF-8 后再导入。",
  };
}

export function parseCsv(text: string): CsvRecord[] {
  return parseCsvWithHeaders(text).records;
}

export function getCsvValue(record: CsvRecord, names: string[]) {
  const entries = Object.entries(record);
  for (const name of names) {
    const normalizedName = normalizeHeader(name);
    const match = entries.find(([header]) => normalizeHeader(header) === normalizedName);
    if (match && match[1].trim()) return match[1].trim();
  }
  return "";
}

export function getMatchedCsvFields(headers: string[], aliases: CsvFieldAliases) {
  const matched: CsvMatchedField[] = [];
  const normalizedHeaders = headers.map((header) => ({
    header,
    normalized: normalizeHeader(header),
  }));

  for (const [field, fieldAliases] of Object.entries(aliases)) {
    const normalizedAliases = fieldAliases.map(normalizeHeader);
    const match = normalizedHeaders.find((header) => normalizedAliases.includes(header.normalized));
    if (match) matched.push({ field, header: match.header });
  }

  return matched;
}

export function parseNumberInput(value: string) {
  const cleaned = value.replace(/[,，\s￥¥]/g, "").replace(/rmb/gi, "");
  if (!cleaned) return { value: 0, valid: true };
  const number = Number(cleaned);
  return { value: number, valid: Number.isFinite(number) };
}

export function parseDateInput(value: string) {
  const trimmed = cleanCell(value);
  if (!trimmed) return { value: "", valid: false };

  const compact = trimmed.match(/^(\d{4})(\d{1,2})(\d{1,2})$/);
  if (compact) return normalizeDateParts(compact[1], compact[2], compact[3]);

  const separated = trimmed.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
  if (separated) return normalizeDateParts(separated[1], separated[2], separated[3]);

  const dateTimePrefix = trimmed.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?\s+/);
  if (dateTimePrefix) return normalizeDateParts(dateTimePrefix[1], dateTimePrefix[2], dateTimePrefix[3]);

  const excelSerial = Number(trimmed);
  if (Number.isInteger(excelSerial) && excelSerial > 20000 && excelSerial < 80000) {
    const date = new Date(Date.UTC(1899, 11, 30 + excelSerial));
    return { value: date.toISOString().slice(0, 10), valid: true };
  }

  return normalizeDate(trimmed);
}

export function normalizeContactInput(value: string) {
  const cleaned = cleanCell(value);
  if (!cleaned) return { value: "", usedScientificNotation: false };

  if (!isScientificNotation(cleaned)) {
    return { value: cleaned, usedScientificNotation: false };
  }

  return {
    value: expandScientificNotation(cleaned),
    usedScientificNotation: true,
  };
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function buildParseResult(text: string, encoding: CsvEncoding, aliases: CsvFieldAliases): CsvParseResult {
  const parsed = parseCsvWithHeaders(text);
  const matchedFields = getMatchedCsvFields(parsed.headers, aliases);

  return {
    ...parsed,
    encoding,
    matchedFields,
    warnings: [],
  };
}

function decodeBuffer(buffer: ArrayBuffer, encoding: string) {
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function parseCsvWithHeaders(text: string) {
  const rows = parseCsvRows(text);
  const headers = rows[0]?.map(cleanHeader) ?? [];

  const records = rows
    .slice(1)
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, cleanCell(row[index] ?? "")])),
    )
    .filter((record) => Object.values(record).some((value) => value.trim() !== ""));

  return { headers, records };
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

function cleanHeader(value: string) {
  return cleanCell(value).replace(/^\uFEFF/, "");
}

function cleanCell(value: string) {
  return value.replace(/\uFEFF/g, "").replace(/[\u00A0\u3000]/g, " ").trim();
}

function normalizeHeader(value: string) {
  return cleanHeader(value).replace(/\s/g, "").replace(/[：:]/g, "").toLowerCase();
}

function hasReplacementCharacter(headers: string[]) {
  return headers.some((header) => header.includes("�"));
}

function normalizeDateParts(year: string, month: string, day: string) {
  const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${normalized}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return { value: "", valid: false };
  }

  return { value: normalized, valid: true };
}

function normalizeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { value: "", valid: false };
  return { value: date.toISOString().slice(0, 10), valid: true };
}

function isScientificNotation(value: string) {
  return /^[+-]?\d+(?:\.\d+)?e[+-]?\d+$/i.test(value);
}

function expandScientificNotation(value: string) {
  const match = value.match(/^([+-]?)(\d+)(?:\.(\d+))?e([+-]?\d+)$/i);
  if (!match) return value;

  const [, sign, integerPart, fractionPart = "", exponentRaw] = match;
  const exponent = Number(exponentRaw);
  const digits = `${integerPart}${fractionPart}`.replace(/^0+/, "") || "0";
  const decimalShift = exponent - fractionPart.length;

  if (decimalShift >= 0) return `${sign}${digits}${"0".repeat(decimalShift)}`;

  const decimalIndex = digits.length + decimalShift;
  if (decimalIndex > 0) {
    return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
  }

  return `${sign}0.${"0".repeat(Math.abs(decimalIndex))}${digits}`;
}
