# Demo video script (~75s)

A tight run-through for the submission video. Connect parent → add kid → kid spends → parent revokes.

**Setup before recording:** two Phantom wallets on devnet (Parent + Kid), both with a little SOL.
Run `npm run seed <PARENT_PUBKEY> 1000` so the parent shows a mock-USDC balance.

---

**[0:00–0:10] Hook**
> "This is Loonie — pocket money for Canadian families, on Solana. The twist: your kid gets an
> allowance, but the money never leaves your wallet until they actually spend it."

Show the landing hero. Pan over the three chips: *Funds stay put · Resets monthly · Revocable*.

**[0:10–0:30] Parent sets up**
- Connect the parent wallet. Point out the SOL balance and mock-USDC balance.
- Click **Set up authority** → approve in Phantom. "One-time setup — no funds move."
- In **Add a kid**, paste the kid's pubkey, set **$100 / month**, click **Add** → approve.
> "That created a recurring delegation. I authorized $100 a month — but $100 is still sitting in my wallet."

**[0:30–0:50] Kid spends**
- Switch to the **Kid** wallet, open the **Kid** tab.
- "Here's my allowance: $100 this month, $100 left." 
- Spend **$5** at **Timmies** → approve.
> "The kid pulls the money — capped at what's left this cycle. Watch the remaining drop to $95."
- Open the **Activity** tab.
> "And it's real — here's that pull on-chain, straight from devnet. Click through to the explorer."

**[0:50–1:05] Parent stays in control**
- Back to the **Parent** tab. The kid's card now shows **$95 remaining**.
- Click **Revoke** → approve.
> "Anytime, I can revoke. Allowance gone, rent refunded, and every dollar was always mine."

**[1:05–1:15] Close**
- Toggle CAD/USD. Show the Superteam Canada footer.
> "Set the terms, keep the funds. That's Loonie. Built on Solana's Subscriptions program for
> Superteam Canada."
