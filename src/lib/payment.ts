export const PAYMENT_CURRENCIES = ["RMB", "USD", "Naira", "Cedis", "TZS", "KES", "XOF", "XAF", "AED", "SAR", "其他"] as const;

export const RMB_PAYMENT_METHODS = ["支付宝", "微信", "银行转账", "现金", "其他"] as const;

export function suggestPaymentCurrency(countryOrChannel: string | null | undefined) {
  const value = countryOrChannel?.trim() ?? "";
  if (!value) return "";
  if (value.includes("尼日利亚")) return "Naira";
  if (value.includes("加纳")) return "Cedis";
  if (value.includes("坦桑尼亚")) return "TZS";
  if (value.includes("肯尼亚")) return "KES";
  if (value.includes("喀麦隆")) return "XAF";
  if (value.includes("塞内加尔") || value.includes("科特迪瓦")) return "XOF";
  if (value.includes("塞拉利昂")) return "其他";
  if (value.includes("利比里亚")) return "USD";
  if (value.includes("中国") || value.includes("微信订单") || value.includes("台湾微信") || value.includes("台湾")) return "RMB";
  if (value.includes("美国") || value.includes("加拿大")) return "USD";
  if (value.includes("阿联酋")) return "AED";
  if (value.includes("沙特")) return "SAR";
  return "USD";
}
