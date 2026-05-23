"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TEST_PRODUCT, WALLET_ADDRESS } from "@/lib/product";

type Product = typeof TEST_PRODUCT;

type FlowStep =
  | "idle"
  | "session"
  | "connection"
  | "connecting"
  | "payment-methods"
  | "quote"
  | "checkout"
  | "complete"
  | "error";

type MoonPayClient = {
  getConnection: () => Promise<{ ok: boolean; value?: { status: string }; error?: unknown }>;
  connect: (opts: {
    container: HTMLElement;
    theme?: { appearance: string };
    onEvent: (event: { kind: string; connection?: unknown; payload?: Record<string, unknown> }) => void;
  }) => Promise<{ ok: boolean; value?: { dispose: () => void }; error?: unknown }>;
  getPaymentMethods: () => Promise<{
    ok: boolean;
    value?: Array<{ type: string; availability?: { active?: boolean } }>;
    error?: unknown;
  }>;
  getQuote: (opts: {
    source: string;
    destination: string;
    sourceAmount: string;
    walletAddress: string;
    paymentMethod: string;
  }) => Promise<{
    ok: boolean;
    value?: {
      signature: string;
      destination?: { amount: string; asset?: { code: string } };
      fees?: Record<string, { amount: string }>;
      expiresAt?: string;
    };
    error?: unknown;
  }>;
  setupApplePay: (opts: {
    quote: string;
    container: HTMLElement | null;
    onEvent: (event: { kind: string; payload?: Record<string, unknown> }) => void;
  }) => Promise<{ ok: boolean; value?: { dispose: () => void; setQuote: (sig: string) => void }; error?: unknown }>;
};

type QuoteSummary = {
  destinationAmount?: string;
  destinationCode?: string;
  expiresAt?: string;
  fees?: { network?: string; moonpay?: string };
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

export function Checkout({ product }: { product: Product }) {
  const [step, setStep] = useState<FlowStep>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to checkout");
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteSummary | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  const connectContainerRef = useRef<HTMLDivElement>(null);
  const paymentContainerRef = useRef<HTMLDivElement>(null);
  const applePayDisposeRef = useRef<(() => void) | null>(null);
  const customerIdRef = useRef<string>(
    typeof window !== "undefined"
      ? (localStorage.getItem("moonpay_customer_id") ?? `user_${crypto.randomUUID()}`)
      : "user_guest",
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("moonpay_customer_id", customerIdRef.current);
    }
  }, []);

  const fetchQuote = useCallback(
    async (client: MoonPayClient, method: string) => {
      setStatusMessage("Fetching quote…");

      const quoteResult = await client.getQuote({
        source: product.sourceCurrency,
        destination: product.destinationCurrency,
        sourceAmount: product.priceUsd,
        walletAddress: WALLET_ADDRESS,
        paymentMethod: method,
      });

      if (!quoteResult.ok) {
        throw new Error(getErrorMessage(quoteResult.error, "Failed to get quote"));
      }

      const q = quoteResult.value!;
      setQuote({
        destinationAmount: q.destination?.amount,
        destinationCode: q.destination?.asset?.code ?? product.destinationCurrency,
        expiresAt: q.expiresAt,
        fees: {
          network: q.fees?.network?.amount,
          moonpay: q.fees?.moonpay?.amount,
        },
      });

      return q;
    },
    [product],
  );

  const setupPayment = useCallback(async (client: MoonPayClient, quoteSignature: string, method: string) => {
    if (method !== "apple_pay") {
      setStatusMessage(`Payment method "${method}" selected — Apple Pay is the primary demo flow.`);
      setStep("checkout");
      return;
    }

    setStep("checkout");
    setStatusMessage("Setting up Apple Pay…");

    const container = paymentContainerRef.current;
    if (!container) {
      throw new Error("Payment container not found");
    }

    container.style.opacity = "0";

    const setupResult = await client.setupApplePay({
      quote: quoteSignature,
      container,
      onEvent: (event) => {
        switch (event.kind) {
          case "ready":
            container.style.opacity = "1";
            setStatusMessage("Apple Pay ready — tap the button to pay");
            break;
          case "complete": {
            const txn = event.payload?.transaction as { id?: string; status?: string } | undefined;
            setTransactionId(txn?.id ?? null);
            setStep("complete");
            setStatusMessage(`Transaction ${txn?.status ?? "submitted"}!`);
            break;
          }
          case "quoteExpired":
            setStatusMessage("Quote expired — refresh to get a new one");
            break;
          case "error":
            setError(String(event.payload?.message ?? "Payment failed"));
            setStep("error");
            break;
          case "unsupported":
            setError(
              "Apple Pay is not supported in this browser. Try Safari on iOS/macOS or use MoonPay test mode.",
            );
            setStep("error");
            break;
          default:
            break;
        }
      },
    });

    if (!setupResult.ok) {
      throw new Error(getErrorMessage(setupResult.error, "Failed to set up Apple Pay"));
    }

    applePayDisposeRef.current = setupResult.value?.dispose ?? null;
  }, []);

  const startCheckout = useCallback(async () => {
    setError(null);
    setStep("session");
    setStatusMessage("Creating MoonPay session…");

    try {
      const sessionRes = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalCustomerId: customerIdRef.current }),
      });

      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) {
        throw new Error(sessionData.error ?? "Failed to create session");
      }

      setStep("connection");
      setStatusMessage("Connecting to MoonPay…");

      const { createClient } = await import("@moonpay/platform");

      const clientResult = createClient({
        sessionToken: sessionData.sessionToken,
      });

      if (!clientResult.ok) {
        throw new Error(getErrorMessage(clientResult.error, "Failed to create MoonPay client"));
      }

      const client = clientResult.value as unknown as MoonPayClient;

      const connectionResult = await client.getConnection();
      if (!connectionResult.ok) {
        throw new Error(getErrorMessage(connectionResult.error, "Failed to check connection"));
      }

      const connection = connectionResult.value!;

      if (connection.status === "connectionRequired") {
        setStep("connecting");
        setStatusMessage("Please connect your MoonPay account…");

        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

        const connectContainer = connectContainerRef.current;
        if (!connectContainer) {
          throw new Error("Connect container not found");
        }

        const connectResult = await client.connect({
          container: connectContainer,
          theme: { appearance: "dark" },
          onEvent: (event) => {
            if (event.kind === "ready") {
              setStatusMessage("Complete MoonPay sign-in below");
            }
            if (event.kind === "complete") {
              const frame = event.payload?.frame as { dispose?: () => void } | undefined;
              frame?.dispose?.();
              setStatusMessage("Connected! Loading payment methods…");
            }
            if (event.kind === "error") {
              setError(String(event.payload?.message ?? "Connection failed"));
              setStep("error");
            }
          },
        });

        if (!connectResult.ok) {
          throw new Error(getErrorMessage(connectResult.error, "Failed to start connect flow"));
        }

        await new Promise<void>((resolve, reject) => {
          const checkInterval = setInterval(async () => {
            const recheck = await client.getConnection();
            if (recheck.ok && recheck.value?.status === "active") {
              clearInterval(checkInterval);
              resolve();
            }
          }, 1500);

          setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error("Connection timed out — please try again"));
          }, 120000);
        });
      }

      setStep("payment-methods");
      setStatusMessage("Loading payment methods…");

      const methodsResult = await client.getPaymentMethods();
      if (!methodsResult.ok) {
        throw new Error(getErrorMessage(methodsResult.error, "Failed to list payment methods"));
      }

      const activeMethod =
        methodsResult.value?.find((m) => m.availability?.active !== false)?.type ??
        methodsResult.value?.[0]?.type;

      if (!activeMethod) {
        throw new Error("No payment methods available for your region");
      }

      setPaymentMethod(activeMethod);

      setStep("checkout");

      const quoteValue = await fetchQuote(client, activeMethod);
      await setupPayment(client, quoteValue.signature, activeMethod);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    }
  }, [fetchQuote, setupPayment]);

  const reset = () => {
    applePayDisposeRef.current?.();
    setStep("idle");
    setError(null);
    setQuote(null);
    setTransactionId(null);
    setPaymentMethod(null);
    setStatusMessage("Ready to checkout");
  };

  const isBusy = !["idle", "complete", "error", "checkout"].includes(step);

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

          {quote && (
            <div className="mt-4 space-y-2 rounded-xl bg-moon-bg/60 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-moon-muted">You receive</span>
                <span className="font-medium">
                  ~{quote.destinationAmount} {quote.destinationCode}
                </span>
              </div>
              {quote.fees?.moonpay && (
                <div className="flex justify-between">
                  <span className="text-moon-muted">MoonPay fee</span>
                  <span>${quote.fees.moonpay}</span>
                </div>
              )}
              {paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-moon-muted">Payment</span>
                  <span className="capitalize">{paymentMethod.replace("_", " ")}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </article>

      <StatusPanel step={step} message={statusMessage} error={error} transactionId={transactionId} />

      <section
        className={`rounded-2xl border border-moon-border bg-moon-card p-4 ${step === "connecting" ? "" : "hidden"}`}
        aria-hidden={step !== "connecting"}
      >
        <h2 className="mb-3 text-sm font-semibold text-moon-muted">MoonPay Connect</h2>
        <div ref={connectContainerRef} className="moonpay-frame-container min-h-[320px]" />
      </section>

      <section
        className={`rounded-2xl border border-moon-border bg-moon-card p-4 ${
          (step === "checkout" || step === "complete") && paymentMethod === "apple_pay" ? "" : "hidden"
        }`}
        aria-hidden={!(step === "checkout" || step === "complete") || paymentMethod !== "apple_pay"}
      >
        <h2 className="mb-3 text-sm font-semibold text-moon-muted">Pay with Apple Pay</h2>
        <div ref={paymentContainerRef} className="moonpay-frame-container" />
        <p className="mt-3 text-xs text-moon-muted">
          In test mode, MoonPay renders a mock Apple Pay button that simulates transactions.
        </p>
      </section>

      <div className="flex flex-col gap-3">
        {step === "idle" && (
          <button
            type="button"
            onClick={startCheckout}
            className="w-full rounded-xl bg-moon-accent px-6 py-4 text-base font-semibold text-white transition hover:bg-violet-600 active:scale-[0.98]"
          >
            Buy for ${product.priceUsd}
          </button>
        )}

        {isBusy && (
          <button
            type="button"
            disabled
            className="w-full rounded-xl bg-moon-border px-6 py-4 text-base font-semibold text-moon-muted"
          >
            Processing…
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
            Session token created server-side via <code>/api/session</code>
          </li>
          <li>
            Client SDK: <code>@moonpay/platform</code>
          </li>
          <li>Flow: connect → payment methods → quote → Apple Pay</li>
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
