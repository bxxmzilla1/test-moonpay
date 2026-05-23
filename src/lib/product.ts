export const TEST_PRODUCT = {
  id: "test-crypto-pack",
  name: "Test Crypto Pack",
  description:
    "A test digital product. Pay instantly as a guest — no MoonPay account or sign-up required.",
  priceUsd: "10.00",
  sourceCurrency: "USD",
  destinationCurrency: "ETH",
} as const;

export const WALLET_ADDRESS =
  process.env.NEXT_PUBLIC_WALLET_ADDRESS ??
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
