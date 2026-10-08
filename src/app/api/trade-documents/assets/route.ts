import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { tradeApi } from "@/lib/trade-documents/http";
import { managedImagePath } from "@/lib/trade-documents/model";
import { TRADE_BUCKET } from "@/lib/trade-documents/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return tradeApi(request, async () => {
    if (Number(request.headers.get("content-length") ?? 0) > 2200000)
      throw new Error("图片最大 2 MB");
    const form = await request.formData(),
      file = form.get("file");
    if (!(file instanceof File) || file.size > 2000000 || file.size < 16)
      throw new Error("请上传不超过 2 MB 的 PNG 或 JPEG 图片");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png =
      bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!png && !jpg) throw new Error("图片内容须为 PNG 或 JPEG");
    const path = `images/${randomUUID()}.${png ? "png" : "jpg"}`;
    const { error } = await getSupabaseAdminClient()
      .storage.from(TRADE_BUCKET)
      .upload(path, bytes, {
        contentType: png ? "image/png" : "image/jpeg",
        upsert: false,
      });
    if (error) throw new Error(`图片保存失败：${error.message}`);
    return NextResponse.json({ path });
  });
}
export async function GET(request: Request) {
  return tradeApi(request, async () => {
    const path = managedImagePath(
      new URL(request.url).searchParams.get("path") ?? "",
    );
    if (!path) throw new Error("缺少图片路径");
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(TRADE_BUCKET)
      .createSignedUrl(path, 300);
    if (error) throw new Error("图片读取失败");
    return NextResponse.redirect(data.signedUrl, {
      headers: { "Cache-Control": "private, no-store" },
    });
  });
}
