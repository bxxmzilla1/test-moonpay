# MoonPay Test Shop PWA

A Progressive Web App that demonstrates the [MoonPay Platform API](https://dev.moonpay.com/platform/overview/introduction) headless checkout flow. Buy a test product ($10 USD → ETH) using MoonPay test mode.

## Features

- **MoonPay Platform integration** — session token, connect, payment methods, quote, Apple Pay
- **Server-side session creation** — secret API key never exposed to the browser
- **PWA ready** — manifest, service worker, installable on mobile/desktop
- **Vercel deployable** — Next.js App Router with API routes

## Quick start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd moonpay-test-pwa
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set your MoonPay **test** secret key from the [MoonPay Developer Dashboard](https://dev.moonpay.com):

```
MOONPAY_SECRET_KEY=sk_test_...
NEXT_PUBLIC_WALLET_ADDRESS=0xYourEthereumWalletAddress
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Add environment variables:
   - `MOONPAY_SECRET_KEY` — your MoonPay test secret key
   - `NEXT_PUBLIC_WALLET_ADDRESS` — destination ETH wallet
4. Deploy

Vercel auto-detects Next.js — no extra config needed.

## MoonPay flow

This app follows the [MoonPay Platform quickstart](https://dev.moonpay.com/platform/overview/introduction):

1. **Session token** — `POST /api/session` creates a token server-side
2. **Connect customer** — SDK checks connection; shows connect frame if needed
3. **Payment methods** — lists available methods (Apple Pay in test mode)
4. **Quote** — fetches fees and ETH amount for the test product
5. **Apple Pay** — headless payment button (mock in test mode)

## Test product

| Field | Value |
|-------|-------|
| Name | Test Crypto Pack |
| Price | $10.00 USD |
| Receive | ETH |
| Wallet | `NEXT_PUBLIC_WALLET_ADDRESS` |

Edit `src/lib/product.ts` to change the product.

## Project structure

```
src/
├── app/
│   ├── api/session/route.ts   # MoonPay session token endpoint
│   ├── layout.tsx             # PWA metadata
│   └── page.tsx               # Shop page
├── components/
│   ├── Checkout.tsx           # MoonPay checkout flow
│   └── ServiceWorkerRegister.tsx
└── lib/
    └── product.ts             # Test product config
public/
├── manifest.json              # PWA manifest
├── sw.js                      # Service worker
└── icons/                     # App icons
```

## Notes

- Use a **test** API key (`sk_test_...`) for development
- In test mode, MoonPay renders a **mock Apple Pay button** — no real Apple Pay account needed
- The secret key must only be set as a server environment variable, never in client code

## License

MIT
