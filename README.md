# MoonPay Test Shop PWA

A Progressive Web App with **one-click guest checkout** for a test product ($10 USD → ETH). No MoonPay account, email, or sign-up required.

## Features

- **Guest checkout** — tap Pay and you're done
- **PWA ready** — manifest, service worker, installable on mobile/desktop
- **Vercel deployable** — Next.js App Router

## Quick start

```bash
git clone https://github.com/bxxmzilla1/test-moonpay.git
cd test-moonpay
npm install
cp .env.example .env.local   # optional — wallet address only
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Import [bxxmzilla1/test-moonpay](https://github.com/bxxmzilla1/test-moonpay) in [Vercel](https://vercel.com/new)
2. Optional env var: `NEXT_PUBLIC_WALLET_ADDRESS` — destination ETH wallet shown in the UI
3. Deploy — no API keys required

## Test product

| Field | Value |
|-------|-------|
| Name | Test Crypto Pack |
| Price | $10.00 USD |
| Receive | ETH |
| Checkout | Guest (no sign-up) |

Edit `src/lib/product.ts` to change the product.

## Project structure

```
src/
├── app/api/checkout/route.ts  # Guest payment endpoint
├── components/Checkout.tsx    # One-click guest checkout UI
└── lib/product.ts             # Test product config
public/
├── manifest.json              # PWA manifest
└── sw.js                      # Service worker
```

## Note

This demo uses **simulated guest checkout** — it does not process real payments or call MoonPay. For production fiat-to-crypto, MoonPay requires customer verification (email/KYC) by regulation.

## License

MIT
