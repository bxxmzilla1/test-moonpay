import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secretKey = process.env.MOONPAY_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json(
      { error: "MOONPAY_SECRET_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let urlForSignature: string | undefined;

  try {
    const body = await request.json();
    urlForSignature = body.urlForSignature;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!urlForSignature || typeof urlForSignature !== "string") {
    return NextResponse.json({ error: "urlForSignature is required." }, { status: 400 });
  }

  try {
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(new URL(urlForSignature).search)
      .digest("base64");

    return NextResponse.json({ signature });
  } catch {
    return NextResponse.json({ error: "Failed to sign URL." }, { status: 400 });
  }
}
