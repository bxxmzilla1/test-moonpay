# MoonPay Test Shop PWA

A Progressive Web App that lets you buy a test product ($10 USD → ETH) using MoonPay in sandbox mode.

## Features

- **MoonPay Widget SDK** — official `@moonpay/moonpay-js` checkout overlay
- **Server-side URL signing** — secret key never exposed to the browser
- **PWA ready** — manifest, service worker, installable on mobile/desktop
- **Vercel deployable** — Next.js App Router with API routes

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/bxxmzilla1/test-moonpay.git
cd test-moonpay
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Get your keys from the [MoonPay Dashboard](https://dashboard.moonpay.com/developers/):

```
MOONPAY_SECRET_KEY=sk_test_...
NEXT_PUBLIC_MOONPAY_API_KEY=pk_test_...
NEXT_PUBLIC_WALLET_ADDRESS=0xYourEthereumWalletAddress
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Import [bxxmzilla1/test-moonpay](https://github.com/bxxmzilla1/test-moonpay) in [Vercel](https://vercel.com/new)
2. Add environment variables:
   - `MOONPAY_SECRET_KEY` — your `sk_test_...` secret key
   - `NEXT_PUBLIC_MOONPAY_API_KEY` — your `pk_test_...` publishable key
   - `NEXT_PUBLIC_WALLET_ADDRESS` — destination ETH wallet
3. Deploy

## MoonPay flow

1. User clicks **Buy** — widget is initialized with product params
2. **URL signing** — `POST /api/sign` signs the widget URL server-side
3. **Checkout** — MoonPay overlay opens in sandbox mode
4. **Complete** — transaction callback updates the UI

See the [MoonPay Web SDK docs](https://dev.moonpay.com/widget/on-ramp-web-sdk) and [sandbox testing guide](https://dev.moonpay.com/widget/faq-sandbox-testing).

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
│   ├── api/sign/route.ts      # Widget URL signing endpoint
│   ├── layout.tsx             # PWA metadata
│   └── page.tsx               # Shop page
├── components/
│   ├── Checkout.tsx           # MoonPay widget checkout
│   └── ServiceWorkerRegister.tsx
└── lib/
    └── product.ts             # Test product config
public/
├── manifest.json              # PWA manifest
├── sw.js                      # Service worker
└── icons/                     # App icons
```

## Notes

- Use **test** keys (`sk_test_...` / `pk_test_...`) for development
- Use [MoonPay test cards](https://dev.moonpay.com/widget/faq-sandbox-testing#adding-a-payment-method) in sandbox mode
- The secret key must only be set as a server environment variable

## License

MIT
