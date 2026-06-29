export const COUNTRY_CHANNEL_OPTIONS = [
  "尼日利亚",
  "加纳",
  "坦桑尼亚",
  "肯尼亚",
  "乌干达",
  "喀麦隆",
  "利比里亚",
  "塞拉利昂",
  "安哥拉",
  "科特迪瓦",
  "塞内加尔",
  "阿联酋",
  "沙特",
  "阿曼",
  "卡塔尔",
  "科威特",
  "约旦",
  "黎巴嫩",
  "埃及",
  "以色列",
  "美国/加拿大",
  "台湾微信",
  "微信订单",
  "中国",
  "其他",
] as const;

export function countryOptionsWithCurrent(current: string | null | undefined) {
  const value = current?.trim();
  if (!value || COUNTRY_CHANNEL_OPTIONS.includes(value as (typeof COUNTRY_CHANNEL_OPTIONS)[number])) {
    return COUNTRY_CHANNEL_OPTIONS;
  }

  return [value, ...COUNTRY_CHANNEL_OPTIONS] as const;
}
