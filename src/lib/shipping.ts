export const SHIPPING_STATUSES = ["未发货", "备货中", "部分发货", "已发货", "无需发货"] as const;
export const SHIPPING_METHODS = ["快运", "物流", "自提/其他"] as const;
export const PENDING_SHIPPING_STATUSES = ["未发货", "备货中", "部分发货"] as const;

export type ShippingStatus = (typeof SHIPPING_STATUSES)[number];
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export function normalizeShippingStatus(value: string | null | undefined): ShippingStatus {
  const trimmed = value?.trim();
  return SHIPPING_STATUSES.includes(trimmed as ShippingStatus) ? (trimmed as ShippingStatus) : "未发货";
}

export function normalizeShippingMethod(value: string | null | undefined): ShippingMethod | null {
  const trimmed = value?.trim();
  return SHIPPING_METHODS.includes(trimmed as ShippingMethod) ? (trimmed as ShippingMethod) : null;
}

export function isPendingShippingStatus(value: string | null | undefined) {
  return PENDING_SHIPPING_STATUSES.some((status) => status === normalizeShippingStatus(value));
}

export function needsShippingInfoReminder(status: string | null | undefined, trackingNo?: string | null, shippingDate?: string | null) {
  return normalizeShippingStatus(status) === "已发货" && !trackingNo?.trim() && !shippingDate?.trim();
}
