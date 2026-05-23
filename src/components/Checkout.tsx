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

  const startCheckout = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_MOONPAY_API_KEY;

    if (!apiKey) {
      setError("NEXT_PUBLIC_MOONPAY_API_KEY is not configured.");
      setStep("error");
      return;
    }

    setStep("loading");
    setError(null);
    setStatusMessage("Opening MoonPay checkout…");

    try {
      const { loadMoonPay } = await import("@moonpay/moonpay-js");
      const moonPay = await loadMoonPay();

      if (!moonPay) {
        throw new Error("Failed to load MoonPay SDK");
      }

      const widget = moonPay({
        flow: "buy",
        environment: "sandbox",
        variant: "overlay",
        useWarnBeforeRefresh: false,
        params: {
          apiKey,
          baseCurrencyCode: product.sourceCurrency.toLowerCase(),
          baseCurrencyAmount: product.priceUsd,
          defaultCurrencyCode: product.destinationCurrency.toLowerCase(),
          walletAddress: WALLET_ADDRESS,
        },
        handlers: {
          async onTransactionCompleted(props) {
            setTransactionId(props.id);
            setStep("complete");
            setStatusMessage("Purchase complete!");
          },
        },
      });

      if (!widget) {
        throw new Error("Failed to initialize MoonPay widget");
      }

      const urlForSignature = widget.generateUrlForSigning();

      const signRes = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlForSignature }),
      });

      const signData = await signRes.json();
      if (!signRes.ok) {
        throw new Error(signData.error ?? "Failed to sign checkout URL");
      }

      widget.updateSignature(signData.signature);
      widget.show();

      setStep("idle");
      setStatusMessage("Complete your purchase in the MoonPay widget");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
      setStatusMessage("Checkout failed");
    }
  }, [product]);

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

          <div className="mt-4 rounded-xl bg-moon-bg/60 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-moon-muted">Receive</span>
              <span className="font-medium">{product.destinationCurrency}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-moon-muted">Wallet</span>
              <span className="max-w-[180px] truncate font-mono text-xs">{WALLET_ADDRESS}</span>
            </div>
          </div>
        </div>
      </article>

      <StatusPanel step={step} message={statusMessage} error={error} transactionId={transactionId} />

      <div className="flex flex-col gap-3">
        {(step === "idle" || step === "loading") && (
          <button
            type="button"
            onClick={startCheckout}
            disabled={step === "loading"}
            className="w-full rounded-xl bg-moon-accent px-6 py-4 text-base font-semibold text-white transition hover:bg-violet-600 active:scale-[0.98] disabled:opacity-60"
          >
            {step === "loading" ? "Opening checkout…" : `Buy for $${product.priceUsd}`}
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

      <details className="rounded-xl border border-moon-border bg-moon-card/50 p-4 text-sm text-moon-muted">
        <summary className="cursor-pointer font-medium text-white">Integration details</summary>
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs">
          <li>
            Widget SDK: <code>@moonpay/moonpay-js</code>
          </li>
          <li>
            URL signing via <code>/api/sign</code> (secret key stays server-side)
          </li>
          <li>Sandbox mode — use test cards from MoonPay docs</li>
          <li>
            Wallet: <code className="break-all">{WALLET_ADDRESS}</code>
          </li>
        </ul>
      </details>
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
      {transactionId && <p className="mt-1 font-mono text-xs opacity-80">Transaction: {transactionId}</p>}
    </div>
  );
}
