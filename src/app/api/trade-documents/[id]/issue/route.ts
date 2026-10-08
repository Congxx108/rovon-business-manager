import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { tradeApi, readBody } from "@/lib/trade-documents/http";
import { assertIssueReady } from "@/lib/trade-documents/model";
import { generatePdf } from "@/lib/trade-documents/pdf-storage";
import {
  readDocument,
  revision,
  TRADE_BUCKET,
} from "@/lib/trade-documents/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return tradeApi(request, async () => {
    const { id } = await params,
      body = await readBody(request),
      doc = await readDocument(id);
    if (doc.revision !== revision(body.revision))
      throw new Error("版本冲突：单据已被其他窗口修改，请重新载入");
    if (doc.status !== "draft") throw new Error("只有草稿可以确认出具");
    assertIssueReady(doc.data, doc.document_type);
    const bytes = await generatePdf({ ...doc, status: "issued" }),
      pdfPath = `versions/${doc.id}/${randomUUID()}.pdf`,
      client = getSupabaseAdminClient();
    const { error: uploadError } = await client.storage
      .from(TRADE_BUCKET)
      .upload(pdfPath, bytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadError) throw new Error(`PDF保存失败：${uploadError.message}`);
    const { data, error } = await client.rpc("issue_trade_document", {
      p_id: id,
      p_revision: doc.revision,
      p_pdf_path: pdfPath,
      p_hash: createHash("sha256").update(bytes).digest("hex"),
    });
    if (error) {
      await client.storage.from(TRADE_BUCKET).remove([pdfPath]);
      throw new Error(error.message);
    }
    return NextResponse.json({ document: data });
  });
}
