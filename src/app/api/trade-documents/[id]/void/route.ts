import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { tradeApi, readBody } from "@/lib/trade-documents/http";
import { requireUuid, revision } from "@/lib/trade-documents/server";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return tradeApi(request, async () => {
    const { id } = await params,
      body = await readBody(request),
      expected = revision(body.revision);
    const { data, error } = await getSupabaseAdminClient()
      .from("trade_documents")
      .update({
        status: "void",
        revision: expected + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requireUuid(id))
      .eq("revision", expected)
      .neq("status", "void")
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("版本冲突：单据已变更或已作废，请重新载入");
    return NextResponse.json({ document: data });
  });
}
