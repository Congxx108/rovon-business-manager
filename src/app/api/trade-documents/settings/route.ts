import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { tradeApi, readBody } from "@/lib/trade-documents/http";
import { normalizeSettings } from "@/lib/trade-documents/model";
import { revision } from "@/lib/trade-documents/server";
export async function POST(request: Request) {
  return tradeApi(request, async () => {
    const body = await readBody(request);
    const { data, error } = await getSupabaseAdminClient()
      .from("trade_document_settings")
      .update({
        data: normalizeSettings(body.data),
        revision: revision(body.revision) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "default")
      .eq("revision", body.revision)
      .select("revision")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data)
      throw new Error(
        "版本冲突：设置已被其他窗口修改，请复制当前内容后重新载入",
      );
    return NextResponse.json(data);
  });
}
