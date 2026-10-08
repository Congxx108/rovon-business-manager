import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
export async function tradeApi(
  request: Request,
  fn: () => Promise<Response>,
): Promise<Response> {
  if (!(await getCurrentUser()))
    return NextResponse.json(
      { error: "登录已失效，请重新登录" },
      { status: 401 },
    );
  if (
    !["GET", "HEAD"].includes(request.method) &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return NextResponse.json({ error: "请求来源不正确" }, { status: 403 });
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : "单据操作失败";
    console.error(
      "[trade-documents]",
      message.replace(/https?:\/\/\S+/g, "[url]"),
    );
    return NextResponse.json(
      { error: message },
      { status: message.includes("版本冲突") ? 409 : 400 },
    );
  }
}
export async function readBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > 500000) throw new Error("单据数据过大，请减少明细或文字");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("请求格式不正确");
  return parsed;
}
