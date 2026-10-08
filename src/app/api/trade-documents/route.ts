import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { tradeApi, readBody } from "@/lib/trade-documents/http";
import {
  isDocumentType,
  normalizeTradeData,
  validDate,
} from "@/lib/trade-documents/model";
import { requireUuid, revision } from "@/lib/trade-documents/server";
export async function POST(request: Request) {
  return tradeApi(request, async () => {
    const body = await readBody(request);
    if (!isDocumentType(body.document_type)) throw new Error("单据类型不正确");
    const no =
      typeof body.document_no === "string" ? body.document_no.trim() : "";
    if (no.length > 100 || /[\r\n\u0000]/.test(no))
      throw new Error("单据编号不正确");
    const { data, error } = await getSupabaseAdminClient().rpc(
      "save_trade_document",
      {
        p_id: body.id ? requireUuid(body.id) : null,
        p_revision: revision(body.revision ?? 0),
        p_type: body.document_type,
        p_no: no,
        p_date: validDate(body.document_date, "单据日期"),
        p_order_id: body.order_id ? requireUuid(body.order_id) : null,
        p_source_id: body.source_document_id
          ? requireUuid(body.source_document_id)
          : null,
        p_data: normalizeTradeData(body.data),
      },
    );
    if (error)
      throw new Error(
        error.code === "23505"
          ? "该类型的单据编号已存在，请使用其他编号"
          : error.message,
      );
    return NextResponse.json({ document: data });
  });
}
