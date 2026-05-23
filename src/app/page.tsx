import { Checkout } from "@/components/Checkout";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { TEST_PRODUCT } from "@/lib/product";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
      <header className="mb-8 text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-moon-accent">
          MoonPay Test PWA
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Test Shop</h1>
        <p className="mt-2 text-moon-muted">
          Headless fiat-to-crypto checkout powered by MoonPay Platform API
        </p>
      </header>

      <Checkout product={TEST_PRODUCT} />

      <footer className="mt-auto pt-10 text-center text-xs text-moon-muted">
        Guest checkout demo — no account required.
      </footer>

      <ServiceWorkerRegister />
    </main>
  );
}
