import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderTradePdf } from "./pdf";
import { TRADE_BUCKET } from "./server";
import type { TradeDocument } from "./model";
export async function generatePdf(doc: TradeDocument) {
  return renderTradePdf(doc, async (path) => {
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(TRADE_BUCKET)
      .download(path);
    if (error || !data) throw new Error("商品图片读取失败，请重新上传后再导出");
    return new Uint8Array(await data.arrayBuffer());
  });
}
