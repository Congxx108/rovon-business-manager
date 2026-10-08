export const DOCUMENT_TYPES = {
  pi: "PI 形式发票",
  ci: "CI 商业发票",
  packing: "Packing List 装箱单",
} as const;
export type DocumentType = keyof typeof DOCUMENT_TYPES;
export type BankProfile = {
  id: string;
  name: string;
  currency: string;
  document_type: "pi" | "ci";
  bank_name: string;
  account_name: string;
  account_no: string;
  swift: string;
  address: string;
  remark: string;
};
export type Seller = {
  name: string;
  address: string;
  contact: string;
  phone: string;
};
export type TradeSettings = {
  seller: Seller;
  banks: BankProfile[];
  terms: string[];
  currencies: string[];
};
export type TradeItem = {
  id: string;
  description: string;
  chinese_name: string;
  model: string;
  material: string;
  hs_code: string;
  unit: string;
  quantity: string;
  unit_price: string;
  image_path: string;
  brand: string;
  battery: string;
  packing_group: string;
};
export type PackingGroup = {
  id: string;
  label: string;
  cartons: string;
  gross_weight: string;
  net_weight: string;
  length: string;
  width: string;
  height: string;
};
export type TradeData = {
  seller: Seller;
  buyer: Seller;
  currency: string;
  incoterm: string;
  fob_city: string;
  payment_terms: string;
  payment_method: string;
  valid_until: string;
  bank_profile_id: string;
  bank: Omit<BankProfile, "id" | "name" | "currency" | "document_type">;
  bank_override: string;
  terms: string[];
  fee: string;
  fee_label: string;
  departure: string;
  destination: string;
  delivery: string;
  shipment_label: string;
  invoice_reference: string;
  remark: string;
  declaration: string;
  items: TradeItem[];
  packing_groups: PackingGroup[];
  template_version: string;
};
export type TradeDocument = {
  id: string;
  document_type: DocumentType;
  document_no: string;
  document_date: string;
  order_id: string | null;
  source_document_id: string | null;
  status: "draft" | "issued" | "void";
  revision: number;
  current_version: number;
  data: TradeData;
  created_at: string;
  updated_at: string;
};
export type TradeVersion = {
  id: string;
  document_id: string;
  version: number;
  document_no: string;
  document_type: DocumentType;
  document_date: string;
  data: TradeData;
  pdf_path: string;
  pdf_sha256: string;
  created_at: string;
};
export const TEMPLATE_VERSION = "2026-10-08.1";
export const EMPTY_BANK = {
  bank_name: "",
  account_name: "",
  account_no: "",
  swift: "",
  address: "",
  remark: "",
};
export const DEFAULT_SETTINGS: TradeSettings = {
  seller: {
    name: "ROVON GLOBAL Bag Manufacturing Co., Ltd.(Yiwu surong)",
    address: "No.378, Wuyidong Road, Bai'gou Town, Hebei Province, China",
    contact: "Cason",
    phone: "+86 153 0260 5504",
  },
  currencies: [
    "USD",
    "CNY",
    "NGN",
    "GHS",
    "TZS",
    "PHP",
    "GBP",
    "XAF",
    "EUR",
    "KES",
    "XOF",
    "AED",
    "SAR",
  ],
  banks: [],
  terms: [
    "1. All foreign currency exchange rates are valid for 7 days from the date of signing this contract.",
    "2. Goods remain the property of the seller until full payment is received.",
    "3. Claims must be raised within 7 days of receipt of goods.",
    "4. Force majeure events excuse any delay in performance.",
  ],
};
export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === "string" && Object.hasOwn(DOCUMENT_TYPES, value);
}
export function localDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function emptyItem(id: string): TradeItem {
  return {
    id,
    description: "",
    chinese_name: "",
    model: "",
    material: "",
    hs_code: "",
    unit: "pcs",
    quantity: "",
    unit_price: "",
    image_path: "",
    brand: "No",
    battery: "No battery",
    packing_group: "",
  };
}
export function emptyGroup(id: string): PackingGroup {
  return {
    id,
    label: "",
    cartons: "",
    gross_weight: "",
    net_weight: "",
    length: "",
    width: "",
    height: "",
  };
}
export function newTradeData(
  settings: TradeSettings,
  type: DocumentType,
): TradeData {
  const bank = settings.banks.find(
    (b) =>
      b.document_type === (type === "ci" ? "ci" : "pi") && b.currency === "USD",
  );
  return {
    seller: { ...settings.seller },
    buyer: { name: "", address: "", contact: "", phone: "" },
    currency: "USD",
    incoterm: "EXW",
    fob_city: "",
    payment_terms: "Pay in Full",
    payment_method: "Bank Transfer",
    valid_until: "",
    bank_profile_id: bank?.id ?? "",
    bank: bank
      ? {
          bank_name: bank.bank_name,
          account_name: bank.account_name,
          account_no: bank.account_no,
          swift: bank.swift,
          address: bank.address,
          remark: bank.remark,
        }
      : { ...EMPTY_BANK },
    bank_override: "",
    terms: [...settings.terms],
    fee: "0",
    fee_label: "Local shipping fee",
    departure: "",
    destination: "",
    delivery: "",
    shipment_label: "",
    invoice_reference: "",
    remark: "",
    declaration: "",
    items: [emptyItem("item-1")],
    packing_groups: [],
    template_version: TEMPLATE_VERSION,
  };
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("单据数据格式不正确");
  return value as Record<string, unknown>;
}
function str(value: unknown, label: string, max = 400) {
  if (typeof value !== "string") throw new Error(`${label}格式不正确`);
  const text = value.trim();
  if (
    text.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)
  )
    throw new Error(`${label}过长或包含无效字符`);
  return text;
}
export function decimal(
  value: unknown,
  label: string,
  scale = 4,
  max = 1000000000,
): string {
  const text = str(value, label, 30);
  if (!text) return "";
  if (
    !(scale === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`)).test(
      text,
    ) ||
    !Number.isFinite(Number(text)) ||
    Number(text) > max
  )
    throw new Error(`${label}应为非负数字，最多 ${scale} 位小数`);
  return text;
}
function party(value: unknown, label: string): Seller {
  const v = record(value);
  return {
    name: str(v.name, `${label}名称`, 220),
    address: str(v.address, `${label}地址`, 600),
    contact: str(v.contact, `${label}联系人`, 120),
    phone: str(v.phone, `${label}联系方式`, 100),
  };
}
function texts(
  value: unknown,
  label: string,
  maxCount: number,
  maxLength: number,
) {
  if (!Array.isArray(value) || value.length > maxCount)
    throw new Error(`${label}数量超出限制`);
  return value.map((v) => str(v, label, maxLength)).filter(Boolean);
}
export function validDate(value: unknown, label: string, optional = false) {
  const s = str(value, label, 10);
  if (optional && !s) return "";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s
  )
    throw new Error(`${label}不正确`);
  return s;
}
export function managedImagePath(value: unknown) {
  const p = str(value, "图片路径", 160);
  if (p && !/^images\/[a-f0-9-]{36}\.(png|jpg)$/.test(p))
    throw new Error("只能使用本模块上传的图片");
  return p;
}
export function normalizeTradeData(value: unknown): TradeData {
  const v = record(value),
    bank = record(v.bank);
  if (!Array.isArray(v.items) || !v.items.length || v.items.length > 100)
    throw new Error("商品明细应为 1–100 行");
  if (!Array.isArray(v.packing_groups) || v.packing_groups.length > 100)
    throw new Error("装箱组最多 100 组");
  const items = v.items.map((raw, i): TradeItem => {
    const x = record(raw);
    return {
      id: str(x.id, "商品标识", 80),
      description: str(x.description, "商品描述", 400),
      chinese_name: str(x.chinese_name, "中文品名", 100),
      model: str(x.model, "规格型号", 100),
      material: str(x.material, "材质", 100),
      hs_code: str(x.hs_code, "HS Code", 30),
      unit: str(x.unit, "单位", 20),
      quantity: decimal(x.quantity, `第 ${i + 1} 行数量`, 0, 100000000),
      unit_price: decimal(x.unit_price, `第 ${i + 1} 行单价`),
      image_path: managedImagePath(x.image_path),
      brand: str(x.brand, "品牌", 100),
      battery: str(x.battery, "电池信息", 50),
      packing_group: str(x.packing_group, "装箱组", 80),
    };
  });
  const groups = v.packing_groups.map((raw, i): PackingGroup => {
    const x = record(raw);
    return {
      id: str(x.id, "装箱组标识", 80),
      label: str(x.label, "装箱组名称", 100),
      cartons: decimal(x.cartons, `装箱组 ${i + 1} 箱数`, 0, 1000000),
      gross_weight: decimal(x.gross_weight, "单箱毛重", 3, 100000),
      net_weight: decimal(x.net_weight, "单箱净重", 3, 100000),
      length: decimal(x.length, "外箱长", 2, 10000),
      width: decimal(x.width, "外箱宽", 2, 10000),
      height: decimal(x.height, "外箱高", 2, 10000),
    };
  });
  if (
    items.some((x) => !x.id) ||
    groups.some((x) => !x.id) ||
    new Set(items.map((x) => x.id)).size !== items.length ||
    new Set(groups.map((x) => x.id)).size !== groups.length
  )
    throw new Error("商品或装箱组标识重复");
  if (
    items.some(
      (x) => x.packing_group && !groups.some((g) => g.id === x.packing_group),
    )
  )
    throw new Error("商品引用的装箱组不存在");
  const currency = str(v.currency, "币种", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency))
    throw new Error("单据币种应为三个英文字母，如 USD、CNY、NGN");
  return {
    seller: party(v.seller, "卖方"),
    buyer: party(v.buyer, "买方"),
    currency,
    incoterm: str(v.incoterm, "贸易条款", 40),
    fob_city: str(v.fob_city, "FOB 城市", 100),
    payment_terms: str(v.payment_terms, "付款条款", 120),
    payment_method: str(v.payment_method, "付款方式", 100),
    valid_until: validDate(v.valid_until, "有效期", true),
    bank_profile_id: str(v.bank_profile_id, "银行配置标识", 100),
    bank: {
      bank_name: str(bank.bank_name, "银行名称", 250),
      account_name: str(bank.account_name, "账户名称", 350),
      account_no: str(bank.account_no, "账号", 100),
      swift: str(bank.swift, "SWIFT/Code", 160),
      address: str(bank.address, "银行地址", 500),
      remark: str(bank.remark, "银行备注", 300),
    },
    bank_override: str(v.bank_override, "手动银行信息", 1400),
    terms: texts(v.terms, "条款", 4, 450),
    fee: decimal(v.fee, "费用", 2),
    fee_label: str(v.fee_label, "费用名称", 100),
    departure: str(v.departure, "起运地", 160),
    destination: str(v.destination, "目的地", 160),
    delivery: str(v.delivery, "运输方式", 100),
    shipment_label: str(v.shipment_label, "出货批次", 100),
    invoice_reference: str(v.invoice_reference, "关联发票编号", 100),
    remark: str(v.remark, "备注", 650),
    declaration: str(v.declaration, "声明", 650),
    items,
    packing_groups: groups,
    template_version: TEMPLATE_VERSION,
  };
}
export function normalizeSettings(value: unknown): TradeSettings {
  const v = record(value);
  if (!Array.isArray(v.banks) || v.banks.length > 60)
    throw new Error("银行配置最多 60 项");
  const banks = v.banks.map((raw) => {
    const x = record(raw);
    if (x.document_type !== "pi" && x.document_type !== "ci")
      throw new Error("银行配置须选择 PI 或 CI");
    const currency = str(x.currency, "银行币种", 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("银行币种不正确");
    return {
      id: str(x.id, "银行标识", 100),
      name: str(x.name, "银行配置名称", 120),
      currency,
      document_type: x.document_type,
      bank_name: str(x.bank_name, "银行名称", 250),
      account_name: str(x.account_name, "账户名称", 350),
      account_no: str(x.account_no, "账号", 100),
      swift: str(x.swift, "SWIFT/Code", 160),
      address: str(x.address, "银行地址", 500),
      remark: str(x.remark, "银行备注", 300),
    } as BankProfile;
  });
  if (
    banks.some((b) => !b.id) ||
    new Set(banks.map((b) => b.id)).size !== banks.length
  )
    throw new Error("银行配置标识重复");
  const currencies = texts(v.currencies, "币种", 30, 3).map((x) =>
    x.toUpperCase(),
  );
  if (!currencies.length || currencies.some((x) => !/^[A-Z]{3}$/.test(x)))
    throw new Error("币种列表不正确");
  return {
    seller: party(v.seller, "卖方"),
    terms: texts(v.terms, "条款", 4, 450),
    banks,
    currencies: [...new Set(currencies)],
  };
}
function scaled(s: string, n: number) {
  const [a, b = ""] = (s || "0").split(".");
  return BigInt(a) * BigInt(10 ** n) + BigInt(b.padEnd(n, "0"));
}
function formatScaled(v: bigint, n: number) {
  const s = v.toString().padStart(n + 1, "0");
  return n ? `${s.slice(0, -n)}.${s.slice(-n)}` : s;
}
export function lineAmount(item: TradeItem) {
  return formatScaled(
    (scaled(item.quantity, 0) * scaled(item.unit_price, 4) + BigInt(50)) /
      BigInt(100),
    2,
  );
}
export function packingTotals(group: PackingGroup) {
  const count = scaled(group.cartons, 0);
  const volume =
    count *
    scaled(group.length, 2) *
    scaled(group.width, 2) *
    scaled(group.height, 2);
  return {
    gross: formatScaled(count * scaled(group.gross_weight, 3), 3),
    net: formatScaled(count * scaled(group.net_weight, 3), 3),
    cbm: formatScaled((volume + BigInt(500000000)) / BigInt(1000000000), 3),
  };
}
export function totals(data: TradeData) {
  const used = data.packing_groups.filter((g) =>
    data.items.some((x) => x.packing_group === g.id),
  );
  const packs = used.map(packingTotals);
  return {
    quantity: data.items.reduce((s, x) => s + Number(x.quantity || 0), 0),
    amount: formatScaled(
      data.items.reduce(
        (s, x) => s + scaled(lineAmount(x), 2),
        scaled(data.fee, 2),
      ),
      2,
    ),
    cartons: used.reduce((s, g) => s + Number(g.cartons || 0), 0),
    gross: formatScaled(
      packs.reduce((s, p) => s + scaled(p.gross, 3), BigInt(0)),
      3,
    ),
    net: formatScaled(
      packs.reduce((s, p) => s + scaled(p.net, 3), BigInt(0)),
      3,
    ),
    cbm: formatScaled(
      packs.reduce((s, p) => s + scaled(p.cbm, 3), BigInt(0)),
      3,
    ),
  };
}
export function assertIssueReady(data: TradeData, type: DocumentType) {
  if (!data.seller.name || !data.buyer.name)
    throw new Error("确认出具前请填写卖方和买方名称");
  if (
    type !== "packing" &&
    data.payment_method.toLowerCase().includes("bank") &&
    !data.bank_override &&
    (!data.bank.bank_name || !data.bank.account_name || !data.bank.account_no)
  )
    throw new Error(
      "银行转账单据须填写银行名称、账户名称及账号，或手动覆盖完整银行信息",
    );
  for (const [i, item] of data.items.entries()) {
    if (!item.description || !item.quantity || Number(item.quantity) <= 0)
      throw new Error(`第 ${i + 1} 行须填写商品描述和正数数量`);
    if (type !== "packing" && !item.unit_price)
      throw new Error(`第 ${i + 1} 行须填写成交单价`);
    if (type === "packing" && !item.packing_group)
      throw new Error(`第 ${i + 1} 行须选择装箱组`);
  }
  if (type === "packing")
    for (const g of data.packing_groups.filter((g) =>
      data.items.some((x) => x.packing_group === g.id),
    )) {
      if (
        [
          g.cartons,
          g.gross_weight,
          g.net_weight,
          g.length,
          g.width,
          g.height,
        ].some((s) => !s || Number(s) <= 0)
      )
        throw new Error("装箱组须填写正数箱数、毛重、净重和外箱尺寸");
      if (Number(g.net_weight) > Number(g.gross_weight))
        throw new Error("单箱净重不能大于毛重");
    }
}
export function safeFileName(no: string, type: DocumentType) {
  return `${type.toUpperCase()}-${no.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90)}.pdf`;
}
