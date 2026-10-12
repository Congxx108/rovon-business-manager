import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedOrderNumber = {
  requested_no: string;
  order_id: string;
  order_no: string;
};

export async function resolveOrderNumbers(supabase: SupabaseClient, numbers: string[]) {
  const requested = Array.from(new Set(numbers.map((number) => number.trim()).filter(Boolean)));
  const resolved = new Map<string, ResolvedOrderNumber>();
  for (let offset = 0; offset < requested.length; offset += 500) {
    const { data, error } = await supabase.rpc("resolve_order_numbers", { p_numbers: requested.slice(offset, offset + 500) });
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as ResolvedOrderNumber[]) resolved.set(row.requested_no, row);
  }
  return resolved;
}
