import { NextResponse } from "next/server";

const TYPESAFE_ENDPOINT = "https://api.typesafe.ai/v1/systemone";

async function checkHealth(clientApiKey?: string) {
  const apiKey = process.env.TYPESAFE_API_KEY || clientApiKey?.trim();
  const configured = Boolean(apiKey);
  if (!configured) return NextResponse.json({ status: "unconfigured", configured, upstream: false });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const headers: HeadersInit = {};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const response = await fetch(TYPESAFE_ENDPOINT, {
      method: "HEAD",
      cache: "no-store",
      headers,
      signal: controller.signal,
    });
    const upstream = response.status < 500;
    return NextResponse.json({ status: upstream ? "online" : "offline", configured, upstream, upstreamStatus: response.status });
  } catch {
    return NextResponse.json({ status: "offline", configured, upstream: false });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  return checkHealth();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return checkHealth(typeof body?.apiKey === "string" ? body.apiKey : undefined);
  } catch {
    return checkHealth();
  }
}
