# SupplyPilot — approval-first procurement assistant

An open-source, single-owner hackathon prototype for an SMB supply buyer. It opens directly into a purchasing workspace: enter a brief and structured constraints, compare a grounded fixture catalog, edit the proposal, approve exact items and totals, run a simulated checkout, and inspect durable receipts and an audit trail.

## Honest integration status

- **Working:** fixture-based sourcing across shipping, office and cleaning supplies; all-in quote arithmetic; server-enforced budget, seller, quantity, stock, delivery and low-waste policy; exact review version and SHA-256 quote binding; 15-minute approval expiry; changed-price/stock rejection; lost-response retry; durable D1 state, receipts and audit; mobile-responsive interface; keyboard-accessible native inputs and approval dialog.
- **Payment demo:** the default is a local payment simulator. It does not call PayPal, move money, place a real order or dispatch goods. The three sourcing labels and all catalog inventory are fictional, modeled under one demo merchant.
- **Real PayPal sandbox adapter:** server-side OAuth token exchange, Orders v2 create, buyer approval redirect, capture and status reconciliation are implemented. The API base is hard-coded to `https://api-m.sandbox.paypal.com`. Stable UUID `PayPal-Request-Id` values are persisted before side effects. Capture currency and exact total are verified. It is unconfigured and has been validated with mocked transport, not real sandbox credentials or funds.
- **AI:** the default is an explicit, deterministic ranking heuristic. The free-text brief is stored but is not semantically parsed. Structured category/quantity/budget/constraints are authoritative. An optional server-only OpenAI Responses adapter can explain supplied candidates; it cannot change prices, override policy or execute checkout. No provider key is configured and no AI provider calls were made.
- **Not included:** live supplier/retailer integrations, Channel3, arbitrary-retailer PayPal acceptance, real fulfilment, supplier inventory reservation, production tax logic, multi-user roles or verified PayPal webhooks. These are integration work, not claimed capabilities.

## Run locally

Node.js 24+ is required. There are **no npm dependencies** and no installation step.

    npm run build
    npm test
    npm run validate
    npm run dev

The local server prints `http://127.0.0.1:8812`. Set `PORT` to select another port. The local server stores its demo SQLite database under ignored `.local/`. It intentionally uses simulator mode. The Worker expects a D1-compatible `DB` binding. Hosting configuration is intentionally omitted. Authentication, per-user authorization and storage isolation are required before exposing this single-owner application to other users.

The app uses a dependency-free Worker with TypeScript stripped by Node's built-in transformer. Source modules are combined deterministically by `scripts/build.mjs`; the browser client and stylesheet are embedded. No remote CDN dependencies or build-time network calls are needed.

## Sandbox configuration

Use an existing PayPal sandbox merchant application and set these as **server-side deployment variables/secrets**:

    PAYPAL_MODE=sandbox
    PAYPAL_CLIENT_ID=<sandbox client ID>
    PAYPAL_CLIENT_SECRET=<sandbox client secret>

The sandbox merchant must represent this demo catalog. Never use unrelated retailer inventory and imply that it can be purchased through this merchant. Do not use live credentials. No `NEXT_PUBLIC_` credentials, keys in HTML, client secret inputs, account creation or credential persistence workflows are included.

Then approve the exact proposal, choose PayPal Sandbox checkout, approve using a sandbox buyer account at PayPal, return to the app, check status and explicitly capture. The app does not automatically capture on redirect. Check status after an uncertain response; it reconciles a completed capture into one receipt. It can abandon only an order verified as uncaptured with no capture attempt. If a capture was attempted or the result is uncertain, it fails closed and requires reconciliation. Approvals expire after 15 minutes; a read-only status check remains available afterward.

An uncertain create attempt without a returned provider order ID cannot be blindly reset. The same create request ID is reused for up to five hours, within the intended idempotency window. Later uncertainty requires operator reconciliation. This conservative behavior is intentional.

Optional AI explanation configuration:

    OPENAI_API_KEY=<server-only existing key>

Only when configured and explicitly requested from the Connections page does the app send the saved brief and fixture candidates to OpenAI. Do not enter sensitive information in this demo. The adapter uses `gpt-4.1-mini`; change and test this choice before production.

## Safety architecture

- Integer cents throughout; `USD` only. Fixed fixture tax is 8.75% of items, rounded once. Fixture shipping is waived at $250 item subtotal.
- The UI sends both its displayed workspace version and quote fingerprint when approving. The server refuses an unseen changed quote, even when the user has another tab open.
- The fingerprint binds line IDs/names, seller, quantity, unit price, stock and catalog revision, delivery, shipping, tax, total, currency and merchant.
- API commands revalidate policy. Text from a catalog or AI response is data, never authority to buy.
- Database compare-and-swap commits avoid overlapping mutations. A duplicate simulator checkout reuses the durable receipt and does not debit stock twice.
- Sandbox create/capture request IDs persist before network calls. A capture-start marker prevents unsafe abandonment. Uncertain operations remain visible instead of being silently retried as a new order.
- Cross-origin writes are rejected. Inputs are validated, UI content escaped, client requests contain no secrets, and the Worker sets a restrictive same-origin connection policy.
- This prototype is designed for single-owner use. Production multi-user use requires identity-scoped storage and authorization. The latest 200 audit events are retained; receipts are preserved on request reset.

## Demo script (90 seconds)

1. Start with 8 packs of recyclable mailers, $300 budget, delivery within five days. The first offer is $201.66 including fixture shipping/tax.
2. Select a different offer or adjust quantity. Show the delivered total and policy gates. Set the budget to $100 to show approval is blocked, then restore $300.
3. Review & approve the exact $201.66 USD quote. Click “Price +$2.50”. The old approval becomes stale, and checkout is unavailable until a fresh review.
4. Reset, approve again, enable “Interrupt next demo response”, and simulate checkout. The initial response is intentionally interrupted after committing one receipt. Retry and show that the original receipt is recovered, with one stock deduction.
5. Open Order history and Audit trail. Inspect/download the receipt and export the audit. Open Connections to distinguish the working simulator from the unconfigured real sandbox and optional AI adapters.

## Tests and verification

`npm test` runs 22 tests covering cents arithmetic, budget/seller/quantity/delivery gates, malformed values, stale displayed quotes, approval expiry, stock changes, lost-response recovery, concurrent checkout, one-receipt/one-debit idempotency, reset preservation, sandbox-only transport, stable request IDs, exact captured amounts, cross-origin rejection, unconfigured integrations, and expired/uncertain sandbox recovery. The final bundle is also imported and validated as a Worker ES module. All PayPal tests use fake transport; none calls PayPal.

The CSS includes 1450/1180/930/760/500px responsive breakpoints, visible focus rings, reduced motion support, native dialog focus handling, and a skip link. Source checks verify these hooks; a full mobile browser/device accessibility audit remains to be done. Source/API checks do not establish completed visual browser QA.

## Source map

- `public-ui/`: HTML, responsive stylesheet and browser controller
- `lib/procurement/domain.ts`: fixtures, policy, quote, approval and simulator
- `lib/procurement/paypal.ts`: sandbox Orders adapter and capture verification
- `lib/procurement/ai.ts`: optional explanation-only provider adapter
- `lib/procurement/store.ts`: D1 read/compare-and-swap helper
- `worker/index.ts`: API routing, persistence orchestration and sandbox recovery
- `drizzle/0000_workspace.sql`: bounded D1 schema migration
- `db/schema.ts`: matching declarative schema reference
- `tests/`: domain, mock adapter and API regression tests

## Primary API references

- PayPal Orders v2: https://developer.paypal.com/api/orders/v2
- PayPal authentication: https://developer.paypal.com/api/rest/authentication
- PayPal idempotency: https://developer.paypal.com/api/rest/reference/idempotency/

## License

MIT; see [LICENSE](LICENSE). Third-party APIs and services remain subject to their own terms. No deployment or real payment is included.
