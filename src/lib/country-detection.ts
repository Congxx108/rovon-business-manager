const prefixRules: Array<[string, string]> = [
  ["234", "尼日利亚"],
  ["233", "加纳"],
  ["255", "坦桑尼亚"],
  ["254", "肯尼亚"],
  ["256", "乌干达"],
  ["237", "喀麦隆"],
  ["231", "利比里亚"],
  ["232", "塞拉利昂"],
  ["244", "安哥拉"],
  ["221", "塞内加尔"],
  ["225", "科特迪瓦"],
  ["971", "阿联酋"],
  ["966", "沙特"],
  ["968", "阿曼"],
  ["974", "卡塔尔"],
  ["965", "科威特"],
  ["962", "约旦"],
  ["961", "黎巴嫩"],
  ["886", "台湾"],
  ["852", "香港"],
  ["853", "澳门"],
  ["63", "菲律宾"],
  ["20", "埃及"],
  ["1", "美国/加拿大"],
];

export function detectCountryFromContact(contact: string | null | undefined) {
  if (!contact) return null;
  const lowered = contact.toLowerCase();

  if (lowered.includes("台湾微信")) return "台湾微信";
  if (lowered.includes("微信") || lowered.includes("wechat") || /\bwx\b/i.test(contact)) return "微信订单";

  const normalized = contact.trim().replace(/[\s\-()]/g, "");
  const digits = normalized.startsWith("+") ? normalized.slice(1).replace(/\D/g, "") : normalized.replace(/\D/g, "");
  if (!digits) return null;

  const match = prefixRules.find(([prefix]) => digits.startsWith(prefix));
  return match?.[1] ?? null;
}
