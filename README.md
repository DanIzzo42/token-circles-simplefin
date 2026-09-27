# Token Circles — SimpleFIN Edition

A personal budgeting dashboard that pulls your bank accounts and transactions through [SimpleFIN Bridge](https://bridge.simplefin.org), sorts transactions into categories with rules you teach it, and tracks spending against budgets. It's a static web app: everything runs in your browser, with no backend.

## Features

- **Accounts and balances** from every bank linked in SimpleFIN Bridge, including pending transactions
- **Rule-based categorization**: categorize a transaction once and a keyword rule (e.g. `STARBUCKS` → Dining) catches that merchant from then on, including past transactions
- **Budgets**: monthly or trailing-7-day limits per category, with progress bars and "left / over" amounts
- **Transfers**: a built-in *Transfer* category for money moving between your own accounts (like paying a credit card from checking), left out of income and spending totals so nothing is double-counted
- **This month's income and spending**, plus spending broken down by category
- **Bank connection warnings** from SimpleFIN (e.g. "sign in to your bank again") shown on the dashboard
- Light and dark themes; works on phones

## Using it

### Connect

1. Sign in to [SimpleFIN Bridge](https://bridge.simplefin.org) and link your bank accounts.
2. Under **Apps**, create a new connection and copy its **setup token**.
3. Paste the token into the app and click **Connect**.

The connection is saved in that browser, so you do this once per device. Each setup token can only be used once.

### Two people, same accounts

There's no shared login. Each person connects on their own device with their own setup token:

1. In the same SimpleFIN Bridge account, create a second connection under **Apps** (name it after the person or device) and generate a new setup token.
2. The other person opens the app on their device and connects with that token.

Both connections read the same bank accounts. **Budgets and categorization rules are stored per browser**, so each device keeps its own.

### Categorize and budget

1. **Add a budget.** Its category (e.g. "Dining") becomes something transactions can be assigned to.
2. **Open the "Needs category" tab** and pick a category for a transaction. The suggested keyword is taken from the description; edit it so it matches the merchant (it has to appear in the description). Saving creates a rule that applies to every transaction containing that keyword.
3. Fix mistakes with **Change** on a transaction, or delete a rule under **Categorization rules** (its transactions go back to "Needs category").

Rules match case-insensitively on the transaction description; the first matching rule wins, in the order rules were created. Only expenses are flagged as needing a category; income can still be categorized (e.g. as a Transfer) with its **Categorize** link.

### Refreshing

SimpleFIN Bridge asks apps to make no more than about 24 requests a day. The app caches the last sync in your browser and only fetches again on page load if that sync is more than 6 hours old. **Refresh** always fetches. It loads the last 60 days of transactions.

## Where your data lives

Everything is stored in your browser's `localStorage`:

- the SimpleFIN access credential (a read-only token for your transaction data; it can't move money)
- the last synced accounts and transactions
- your budgets and categorization rules

Nothing is sent anywhere except SimpleFIN. **Disconnect** removes the credential and cached transactions from that browser. Anyone who can use your browser profile can see this data, so only connect on devices you trust. You can revoke a connection at any time in SimpleFIN Bridge.

## Known limitations

- **Not yet tested against a live SimpleFIN Bridge account.** All testing so far uses a mocked SimpleFIN API. In particular, the app calls SimpleFIN directly from the browser, which only works if SimpleFIN allows cross-origin (CORS) requests. If connecting fails with "Couldn't reach SimpleFIN from this browser", that's the likely cause, and the fix is a small server-side proxy.
- Amounts are assumed to be USD.
- Budgets and rules don't sync between devices.

## Development

Requires Node.js 18+.

```bash
npm install
npm run dev        # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run the unit tests once (`npm run test:watch` to watch) |
| `npm run typecheck` | Type-check with `tsc` |
| `npm run lint` | Lint with ESLint (`npm run lint:fix` to auto-fix) |
| `npm run build` | Production build into `dist/` |

CI runs typecheck, lint, tests, and build on every pull request.

### Code layout

```
src/
├── services/
│   ├── simplefin.ts   # SimpleFIN claim flow, /accounts sync (protocol v1 + v2), caching
│   └── budgets.ts     # categorization rules, budgets, keyword guessing, budget math
├── components/        # SolidJS UI
├── types/             # shared types
└── index.css          # styles (light + dark)
```

Both services have unit tests next to them (`*.test.ts`).

### Deploying

`npm run build` produces a static site in `dist/` that any static host can serve (e.g. `npx serve -s dist`, Netlify, Vercel, GitHub Pages). Serve it over HTTPS.

## License

MIT
