import { NextRequest, NextResponse } from "next/server";
import { TEST_PRODUCT } from "@/lib/product";

export async function POST(request: NextRequest) {
  let productId: string | undefined;

  try {
    const body = await request.json();
    productId = body.productId;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (productId !== TEST_PRODUCT.id) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }

  const transactionId = `txn_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

  return NextResponse.json({
    transactionId,
    status: "completed",
    product: {
      id: TEST_PRODUCT.id,
      name: TEST_PRODUCT.name,
      priceUsd: TEST_PRODUCT.priceUsd,
      destinationCurrency: TEST_PRODUCT.destinationCurrency,
    },
    paidAt: new Date().toISOString(),
  });
}
