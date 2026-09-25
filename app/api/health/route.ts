import { NextResponse } from "next/server";

const TYPESAFE_ENDPOINT = "https://api.typesafe.ai/v1/systemone";

export async function GET() {
  const configured = Boolean(process.env.TYPESAFE_API_KEY);
  if (!configured) {
    return NextResponse.json({ status: "unconfigured", configured, upstream: false });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(TYPESAFE_ENDPOINT, {
      method: "HEAD",
      cache: "no-store",
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
