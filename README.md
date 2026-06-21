# Loonie 🍁

> **Pocket money, onchain.** The allowance app for Canadian families — give your kid a
> recurring monthly allowance on Solana where the **funds never leave your wallet** until
> they spend. Fully revocable, no custody, no locked funds.

Built for the **[Superteam Canada](https://superteam.fun/)** bounty: *"Create a compelling
technical demo showcasing innovative use cases for Solana Native Subscriptions and Allowances."*

Runs entirely on **Solana devnet**.

---

## The idea

Most "allowance" apps make you pre-load a kid's wallet — the moment you do, the money is gone
and you've lost control of it. Loonie flips that around using the **Recurring Delegation** model
from Solana's [Subscriptions program](https://github.com/solana-program/subscriptions):

- **You (the parent) are the delegator.** Your mock-USDC stays in *your* token account the entire time.
- **Your kid is the delegatee.** They hold a recurring delegation — say **$100 / month** — a cap that
  resets every cycle.
- **Spending is a pull, not a push.** When the kid needs money, *they* call `transferRecurring`
  to withdraw from your account into their own wallet (with a note for what it's for), capped by
  what's left this period.
- **You stay in control.** Revoke anytime and reclaim the rent. Nothing is ever locked or custodied
  by a third party.

> Set the terms, keep the funds. That's the whole pitch.

---

## Screens

| Role | What they do |
|---|---|
| **Parent** | Connect wallet → one-time authority setup → add kids (amount · period · expiry) → watch remaining-this-cycle and revoke. |
| **Kid** | Connect wallet → see this month's allowance and what's left → withdraw an amount with a note for what it's for. |
| **Activity** | A live on-chain feed of real withdrawals, read from devnet and parsed from the transactions (amount + note) — proof every withdrawal actually happened. |

All three live in one single-page app with a role switcher.

---

## Program instructions used

From [`@solana/subscriptions`](https://www.npmjs.com/package/@solana/subscriptions)
(program ID `De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44`):

| Instruction | Who signs | Role in Loonie |
|---|---|---|
| `initSubscriptionAuthority` | parent | One-time per parent+mint. Creates the Subscription Authority PDA that can delegate on the parent's token account. |
| `createRecurringDelegation` | parent | Authorize a kid for an amount-per-period + period length + expiry. **This is the allowance.** |
| `transferRecurring` | kid | Kid withdraws funds into their own wallet (with an on-chain memo note), capped by the remaining budget this period. |
| `revokeDelegation` | parent | Cancel a kid's allowance and reclaim rent. |

Reads use the package's `fetchDelegationsByDelegator` (parent dashboard) and
`fetchDelegationsByDelegatee` (kid view).

---

## Architecture

A **fully client-side SPA** plus **one local seed script**. There is no app server — the wallet
is the auth, and all reads/writes happen in the browser.

```
src/                      # THE PRODUCT — ships to the browser, no secrets ever
  pages/index.html        # single-page shell + inline SVG sprite
  styles/tailwind.css     # Tailwind v4 theme (Loonie identity)
  scripts/
    main.js               # esbuild entry — wiring, wallet connect, role switch
    lib/                  # config, kit RPC, Wallet Standard signer, subscriptions calls, formatting
    features/             # parent · kid · activity UI
scripts/                  # LOCAL DEV ONLY — never bundled, never deployed
  seed.js                 # create mock-USDC mint, fund parent, make demo kids
.env.local                # script secrets (gitignored)
```

- **On-chain client:** [`@solana/kit`](https://github.com/anza-xyz/kit) (web3.js v2 successor) +
  `@solana/subscriptions`. Wallet connection is framework-agnostic **Wallet Standard** discovery,
  bridged to a kit `TransactionSendingSigner`.
- **Build:** the skeleton's own **esbuild + Tailwind CLI** (no Vite). esbuild bundles `src/scripts/main.js`
  into `dist/js/main.js`; `scripts/` is never part of that bundle.
- **Token:** a Token-2022 **mock-USDC** mint on devnet (6 decimals) created by the seed script.

The wall between the product and the dev tooling is strict: nothing in `src/` imports from `scripts/`,
and no keypair/secret ever lives in `src/` or in a bundled env var.

---

## Getting started

**Prerequisites:** Node 18+, and a Solana wallet (e.g. Phantom) switched to **Devnet**.

```bash
git clone https://github.com/tajo3250/loonie.git
cd loonie
npm install
```

### 1. Seed a devnet mock-USDC mint

The seed script is idempotent and self-bootstrapping. It generates a funder keypair (saved to the
gitignored `.env.local`), airdrops devnet SOL, and creates the mint.

```bash
# Create the mint + fund the funder. Prints the mint address.
npm run seed

# Optional: mint mock-USDC into your parent (Phantom devnet) wallet + airdrop it some SOL,
# and spin up two demo kid wallets.
npm run seed <YOUR_PARENT_PUBKEY> 1000 --kids
```

> Devnet's public faucet is rate-limited. If the airdrop fails, the script prints the funder
> address — top it up at [faucet.solana.com](https://faucet.solana.com) and re-run.

Then paste the printed mint address into `MOCK_USDC_MINT` in
[`src/scripts/lib/config.js`](src/scripts/lib/config.js). (A working author mint is committed there
already; replace it when running your own.) See [`scripts/README.md`](scripts/README.md) for details.

### 2. Run the app

```bash
npm run dev      # watch + serve on http://localhost:3000
# or
npm run build    # static build into dist/ (deploy anywhere)
```

### 3. Try the flow

1. **Parent:** connect (devnet) → **Set up authority** → **Add** a kid (paste a pubkey, e.g. one of the
   demo kids, set $100/month).
2. **Kid:** switch to that wallet → **Kid** tab → **Withdraw** $5 with a note like "lunch".
3. **Parent:** watch *remaining this cycle* drop, then **Revoke** to cancel and reclaim rent.

Funds only move on step 2 — never when you set up the allowance. That's the point.

---

## Canadian angle 🍁

- CAD/USD display toggle (defaults to CAD).
- Canadian framing throughout, CAD-first money display.
- Built for **Superteam Canada**.

---

## License

MIT.
