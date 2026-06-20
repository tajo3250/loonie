# Seed script (local dev only)

Local Node tooling for the Loonie demo. **Never bundled or deployed** — esbuild's only
entry is `src/scripts/main.js`, and nothing in `src/` imports from here. Secrets live in
`.env.local` (gitignored), read only by Node.

## What it does

`scripts/seed.js`:

1. Loads (or generates + persists) a **funder keypair** in `.env.local` as `SEED_FUNDER_SECRET`.
   This keypair is the devnet fee payer and the mock-USDC **mint authority**.
2. Ensures the funder has devnet SOL (airdrops if low — the public faucet is rate-limited,
   so it retries; if it can't, fund the printed address at https://faucet.solana.com).
3. Creates a **Token-2022 mock-USDC mint** (6 decimals) if one isn't recorded yet, and saves
   its address to `SEED_USDC_MINT`. The same address is mirrored (it's public) in
   `src/scripts/lib/config.js` as `MOCK_USDC_MINT`.
4. Optionally funds a parent wallet and creates demo kids.

It is **idempotent** — re-running reuses the saved funder and mint.

## Usage

```bash
# Create the mint (and fund the funder). Prints the mint address.
npm run seed

# Also mint mock-USDC to a parent wallet (e.g. your Phantom devnet address) + airdrop it some SOL.
npm run seed <PARENT_PUBKEY> 1000

# Also generate two demo kid wallets (delegatees) and fund them with a little SOL for fees.
npm run seed <PARENT_PUBKEY> 1000 --kids
```

After the mint exists, paste its address into `MOCK_USDC_MINT` in
`src/scripts/lib/config.js` (already done for the current devnet mint).
