import { NextRequest, NextResponse } from "next/server";

const MOONPAY_SESSIONS_URL = "https://api.moonpay.com/platform/v1/sessions";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "127.0.0.1";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.MOONPAY_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json(
      { error: "MOONPAY_SECRET_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let externalCustomerId = `guest_${crypto.randomUUID()}`;

  try {
    const body = await request.json();
    if (typeof body.externalCustomerId === "string" && body.externalCustomerId) {
      externalCustomerId = body.externalCustomerId;
    }
  } catch {
    // Use generated guest ID when no body is sent
  }

  const deviceIp = getClientIp(request);

  const moonpayResponse = await fetch(MOONPAY_SESSIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": secretKey,
    },
    body: JSON.stringify({
      externalCustomerId,
      deviceIp,
    }),
  });

  const data = await moonpayResponse.json();

  if (!moonpayResponse.ok) {
    return NextResponse.json(
      {
        error: data.message ?? "Failed to create MoonPay session.",
        details: data,
      },
      { status: moonpayResponse.status },
    );
  }

  return NextResponse.json({
    sessionToken: data.sessionToken,
    externalCustomerId,
  });
}
