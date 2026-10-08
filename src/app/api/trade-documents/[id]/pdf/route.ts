import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { tradeApi } from "@/lib/trade-documents/http";
import { safeFileName } from "@/lib/trade-documents/model";
import { generatePdf } from "@/lib/trade-documents/pdf-storage";
import {
  readDocument,
  readVersions,
  TRADE_BUCKET,
} from "@/lib/trade-documents/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return tradeApi(request, async () => {
    const { id } = await params,
      doc = await readDocument(id),
      url = new URL(request.url),
      client = getSupabaseAdminClient();
    const version = url.searchParams.get("version");
    let pdfPath: string,
      filename = safeFileName(doc.document_no, doc.document_type);
    if (version || doc.status !== "draft") {
      const versions = await readVersions(id),
        selected = versions.find(
          (v) =>
            v.version === (version ? Number(version) : doc.current_version),
        );
      if (!selected) throw new Error("该历史版本不存在");
      pdfPath = selected.pdf_path;
      filename = safeFileName(selected.document_no, selected.document_type);
    } else {
      pdfPath = `previews/${id}/revision-${doc.revision}.pdf`;
      const exists = await client.storage
        .from(TRADE_BUCKET)
        .createSignedUrl(pdfPath, 60);
      if (exists.error) {
        const bytes = await generatePdf(doc);
        const { error } = await client.storage
          .from(TRADE_BUCKET)
          .upload(pdfPath, bytes, {
            contentType: "application/pdf",
            upsert: false,
          });
        if (error && !["409", "Duplicate"].includes(error.statusCode ?? ""))
          throw new Error(`PDF预览失败：${error.message}`);
      }
    }
    const { data, error } = await client.storage
      .from(TRADE_BUCKET)
      .createSignedUrl(
        pdfPath,
        300,
        url.searchParams.get("download") === "1"
          ? { download: filename }
          : undefined,
      );
    if (error) throw new Error(`PDF读取失败：${error.message}`);
    return NextResponse.redirect(data.signedUrl, {
      headers: { "Cache-Control": "private, no-store" },
    });
  });
}
