import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.TYPESAFE_API_KEY) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const apiKey = process.env.TYPESAFE_API_KEY || body?.apiKey;
  if (!apiKey) return NextResponse.json({ error: "服务端未配置 TYPESAFE_API_KEY，请检查 .env 文件。" }, { status: 500 });
  try {
    if (!body?.state?.trim() || !body?.questions) return NextResponse.json({ error: "state 和 questions 不能为空。" }, { status: 400 });
    const upstream = await fetch("https://api.typesafe.ai/v1/systemone", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch { return NextResponse.json({ error: "无法连接 Typesafe API，请检查网络或稍后重试。" }, { status: 502 }); }
}
