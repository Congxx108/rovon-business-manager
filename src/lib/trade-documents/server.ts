import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type TradeDocument,
  type TradeSettings,
  type TradeVersion,
} from "./model";
export const TRADE_BUCKET = "trade-document-files";
export const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function requireUuid(id: unknown) {
  if (typeof id !== "string" || !UUID.test(id))
    throw new Error("记录标识不正确");
  return id;
}
export function revision(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new Error("版本号不正确");
  return Number(value);
}
export async function readSettings(): Promise<{
  data: TradeSettings;
  revision: number;
}> {
  const { data, error } = await getSupabaseAdminClient()
    .from("trade_document_settings")
    .select("data,revision")
    .eq("id", "default")
    .single();
  if (error) throw new Error(`单据设置读取失败：${error.message}`);
  return {
    data: normalizeSettings(data?.data ?? DEFAULT_SETTINGS),
    revision: data.revision,
  };
}
export async function readDocument(id: string): Promise<TradeDocument> {
  const { data, error } = await getSupabaseAdminClient()
    .from("trade_documents")
    .select("*")
    .eq("id", requireUuid(id))
    .single();
  if (error || !data) throw new Error("单据不存在或读取失败");
  return data as TradeDocument;
}
export async function readVersions(id: string): Promise<TradeVersion[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("trade_document_versions")
    .select("*")
    .eq("document_id", requireUuid(id))
    .order("version", { ascending: false });
  if (error) throw new Error(`单据历史读取失败：${error.message}`);
  return data as TradeVersion[];
}
