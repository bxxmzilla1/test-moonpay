"use client";

import { useCallback, useState } from "react";
import { TEST_PRODUCT, WALLET_ADDRESS } from "@/lib/product";

type Product = typeof TEST_PRODUCT;

type FlowStep = "idle" | "loading" | "complete" | "error";

export function Checkout({ product }: { product: Product }) {
  const [step, setStep] = useState<FlowStep>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to checkout");
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const payAsGuest = useCallback(async () => {
    setStep("loading");
    setError(null);
    setStatusMessage("Processing payment…");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Payment failed");
      }

      setTransactionId(data.transactionId);
      setStep("complete");
      setStatusMessage("Payment successful — no MoonPay account needed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
      setStatusMessage("Payment failed");
    }
  }, [product.id]);

  const reset = () => {
    setStep("idle");
    setError(null);
    setTransactionId(null);
    setStatusMessage("Ready to checkout");
  };

  return (
    <div className="flex flex-col gap-6">
      <article className="overflow-hidden rounded-2xl border border-moon-border bg-moon-card">
        <div className="relative h-40 bg-gradient-to-br from-violet-900/40 via-moon-card to-moon-bg">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl" aria-hidden>
              ₿
            </span>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-bold">{product.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-moon-muted">{product.description}</p>

          <div className="mt-6 flex items-baseline justify-between border-t border-moon-border pt-4">
            <span className="text-sm text-moon-muted">Price</span>
            <span className="text-2xl font-bold">${product.priceUsd}</span>
          </div>

          <div className="mt-4 space-y-2 rounded-xl bg-moon-bg/60 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-moon-muted">Receive</span>
              <span className="font-medium">{product.destinationCurrency}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-moon-muted">Wallet</span>
              <span className="truncate font-mono text-xs">{WALLET_ADDRESS}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-moon-muted">Checkout</span>
              <span className="font-medium text-emerald-400">Guest — no sign-up</span>
            </div>
          </div>
        </div>
      </article>

      <StatusPanel step={step} message={statusMessage} error={error} transactionId={transactionId} />

      <div className="flex flex-col gap-3">
        {(step === "idle" || step === "loading") && (
          <button
            type="button"
            onClick={payAsGuest}
            disabled={step === "loading"}
            className="w-full rounded-xl bg-moon-accent px-6 py-4 text-base font-semibold text-white transition hover:bg-violet-600 active:scale-[0.98] disabled:opacity-60"
          >
            {step === "loading" ? "Processing…" : `Pay $${product.priceUsd} as guest`}
          </button>
        )}

        {(step === "error" || step === "complete") && (
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-xl border border-moon-border bg-moon-card px-6 py-4 text-base font-semibold transition hover:border-moon-accent"
          >
            {step === "complete" ? "Buy again" : "Try again"}
          </button>
        )}
      </div>

      <p className="text-center text-xs text-moon-muted">
        One-click guest checkout — no MoonPay account or email verification required.
      </p>
    </div>
  );
}

function StatusPanel({
  step,
  message,
  error,
  transactionId,
}: {
  step: FlowStep;
  message: string;
  error: string | null;
  transactionId: string | null;
}) {
  const tone =
    step === "error"
      ? "border-red-500/30 bg-red-950/20 text-red-300"
      : step === "complete"
        ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
        : "border-moon-border bg-moon-card text-moon-muted";

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tone}`} role="status" aria-live="polite">
      {error ? error : message}
      {transactionId && <p className="mt-1 font-mono text-xs opacity-80">Order: {transactionId}</p>}
    </div>
  );
}
