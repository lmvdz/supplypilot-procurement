# SupplyPilot — approval-first procurement assistant

An open-source, single-owner hackathon prototype for an SMB supply buyer. A public project overview leads into a protected purchasing workspace: enter a brief and structured constraints, compare a grounded fixture catalog, edit the proposal, approve exact items and totals, run a simulated checkout, and inspect durable receipts and an audit trail.

## Honest integration status

- **Working:** fixture-based sourcing across shipping, office and cleaning supplies; all-in quote arithmetic; server-enforced budget, seller, quantity, stock, delivery and low-waste policy; exact review version and SHA-256 quote binding; 15-minute approval expiry; changed-price/stock rejection; lost-response retry; durable D1 state, receipts and audit; mobile-responsive interface; keyboard-accessible native inputs and approval dialog.
- **Payment demo:** the default is a local payment simulator. It does not call PayPal, move money, place a real order or dispatch goods. The three sourcing labels and all catalog inventory are fictional, modeled under one demo merchant.
- **Real PayPal sandbox adapter:** server-side OAuth token exchange, Orders v2 create, buyer approval redirect, capture and status reconciliation are implemented. The API base is hard-coded to `https://api-m.sandbox.paypal.com`. Stable UUID `PayPal-Request-Id` values are persisted before side effects. Capture currency and exact total are verified. The hosted application completed an actual $201.66 sandbox test-card capture. PayPal order/capture status and the exact USD amount were verified; one durable receipt and one stock deduction were observed, and duplicate capture reused that receipt. Wallet buyer approval/return UX remains unverified. Transport and recovery boundaries also have mocked tests.
- **AI:** the default is an explicit, deterministic ranking heuristic. The free-text brief is stored but is not semantically parsed. Structured category/quantity/budget/constraints are authoritative. An optional server-only OpenRouter adapter can explain fixture ranking and policy checks; it cannot change prices, override policy or execute checkout. Private configuration returned validated, zero-cost OpenRouter inference through the hosted API on October 5, 2026; paid fallback remains disabled.
- **Not included:** live supplier/retailer integrations, Channel3, arbitrary-retailer PayPal acceptance, real fulfilment, supplier inventory reservation, production tax logic, multi-user roles or verified PayPal webhooks. These are integration work, not claimed capabilities.

## Run locally

Requires Node.js 24 or newer. The build runs without an npm install. The original public 3D scene includes a locally served, MIT-licensed Three.js runtime; see [scene design](docs/SCENE-DESIGN.md).

```sh
node scripts/setup-private.mjs
node scripts/build.mjs
node --experimental-transform-types --test --test-isolation=none tests/*.test.ts tests/*.test.mjs
node scripts/validate-artifact.mjs
node scripts/dev.mjs
```

Open http://127.0.0.1:8812/ for the public project overview, then choose the workspace link or visit /app. Read SITE_OWNER_KEY from the ignored .dev.vars file and enter it at the access gate. Keep this key out of source control, screenshots, recordings, and public submission text. PORT overrides the local port. State persists in ignored .local/ SQLite files; the deployed Worker uses its D1 DB binding.

The initial configuration uses synthetic examples and the no-money simulator. [Private provider setup](docs/PROVIDER-SETUP.md) explains the optional AI and PayPal sandbox configuration. [Cloudflare deployment](docs/DEPLOYMENT.md) describes hosting at https://supplypilot.inkwell.finance. Deployment status is reported separately from implementation.

## Sandbox configuration

Use an existing PayPal sandbox merchant application and set these as **server-side deployment variables/secrets**:

    PAYPAL_MODE=sandbox
    PAYPAL_CLIENT_ID=<sandbox client ID>
    PAYPAL_CLIENT_SECRET=<sandbox client secret>

The sandbox merchant must represent this demo catalog. Never use unrelated retailer inventory and imply that it can be purchased through this merchant. Do not use live credentials. No `NEXT_PUBLIC_` credentials, keys in HTML, client secret inputs, account creation or credential persistence workflows are included.

Then approve the exact proposal, choose PayPal Sandbox checkout, approve using a sandbox buyer account at PayPal, return to the app, check status and explicitly capture. The app does not automatically capture on redirect. Check status after an uncertain response; it reconciles a completed capture into one receipt. It can abandon only an order verified as uncaptured with no capture attempt. If a capture was attempted or the result is uncertain, it fails closed and requires reconciliation. Approvals expire after 15 minutes; a read-only status check remains available afterward.

An uncertain create attempt without a returned provider order ID cannot be blindly reset. The same create request ID is reused for up to five hours, within the intended idempotency window. Later uncertainty requires operator reconciliation. This conservative behavior is intentional.

## Optional OpenRouter AI (synthetic demo only)

The default remains deterministic and requires no keys. The server-only adapter uses OpenRouter's [Chat Completions API](https://openrouter.ai/docs/api_reference/overview), not an OpenAI key substituted into a different endpoint. Enable it only for synthetic demo data with an existing server-held key:

```dotenv
AI_MODE=openrouter
OPENROUTER_API_KEY=<existing server-only key>
AI_BASE_URL=https://openrouter.ai/api/v1
AI_PRIMARY_MODEL=liquid/lfm-2.5-2.6b:free
AI_FALLBACK_MODEL=deepseek/deepseek-v4.1-flash
AI_ALLOW_PAID_FALLBACK=false
AI_FALLBACK_MAX_PROMPT_PRICE=0.02
AI_FALLBACK_MAX_COMPLETION_PRICE=0.50
```

No credentials are included in source control. Optional credentials are held in ignored local configuration and server-only deployment bindings. The old `OPENAI_API_KEY` and `AI_MODE=openai` no longer activate an adapter. A key alone does not enable AI: `AI_MODE=openrouter` is also required. `.env` files remain ignored. Configure the base URL only on the server using a trusted HTTPS OpenRouter-compatible endpoint; credentials in URLs, query strings and redirects are rejected. Never put keys in browser code or a public environment variable.

**Synthetic data only.** This entry sends allowlisted fictional inputs to the optional model provider. Keep real customer, account, capture, payment and other sensitive information out of the demonstration. The input boundaries below apply to every configured model and fallback.

The prepared configuration explicitly selects `liquid/lfm-2.5-2.6b:free`, checked against the OpenRouter model catalog on October 5, 2026. The adapter still requires a zero-price provider; catalog availability is not live inference evidence. The legacy Space Bunny default has a retirement guard and is not used by the prepared configuration. If no free route is available, deterministic rules remain available and paid fallback stays disabled.

Paid fallback is **disabled by default**. Setting the server variable `AI_ALLOW_PAID_FALLBACK=true` deliberately opts into at most one separate [DeepSeek V4.1 Flash](https://openrouter.ai/deepseek/deepseek-v4.1-flash) request when the primary is unavailable, retired or produces invalid output. Authentication, billing and invalid-request errors do not trigger fallback. Its strict schema is requested only on that separate opted-in attempt; a schema requirement cannot route the primary to a paid model. The actual fallback is labeled in the UI.

The primary always has a zero-price provider filter, including when its model is overridden. Fallback filters cap provider prices at $0.02/M input and $0.50/M output by default. These are price ceilings, not a guaranteed available route or account spending budget. [Provider prices and availability vary](https://openrouter.ai/docs/guides/routing/provider-selection); no qualifying provider means deterministic fallback. Deliberately changing these server-side caps can change costs. Requests specify one model, disable provider failover, and never use automatic model routing.

There are at most two free-primary attempts for transient HTTP/transport failures and one opted-in paid attempt, each with a 6-second timeout and 256-token output limit (1024 total tokens for the explicitly configured free Liquid reasoning model). Inputs and response bytes are bounded. Malformed JSON, extra fields, tool calls, refusals, truncated output and invalid values are rejected. Errors shown to users contain no provider bodies, keys or raw transport details. Model output never authorizes a payment or changes server policy.

Live OpenRouter inference was observed on October 5, 2026 for a built-in synthetic example, with validated JSON and zero reported cost. Paid fallback remained disabled. Local mocks cover failure and policy boundaries. The public overview and protected workspace are deployed to this project’s custom domain. The hosted application completed an actual $201.66 sandbox test-card capture. PayPal order/capture status and the exact USD amount were verified; one durable receipt and one stock deduction were observed, and duplicate capture reused that receipt. Wallet buyer approval/return UX remains unverified.

### Procurement input boundary

Only canonical fictional catalog labels, their server-computed ranking and policy-check results are sent. Free-text briefs, requested budgets and quantities, prices, order/capture/session IDs and payment data stay local. AI explains the already-computed ranking; it does not source inventory, calculate or set prices, alter the saved quote, approve or execute checkout. Failed AI returns a deterministic explanation and visible warning.

For local setup, edit the ignored `.dev.vars` file and restart the server. The scripts load missing process variables from this file. Explicit process variables take precedence.

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

`npm test` includes the original 22 domain/payment tests plus mocked OpenRouter transport, input-privacy and approval-invariant tests covering cents arithmetic, budget/seller/quantity/delivery gates, malformed values, stale displayed quotes, approval expiry, stock changes, lost-response recovery, concurrent checkout, one-receipt/one-debit idempotency, reset preservation, sandbox-only transport, stable request IDs, exact captured amounts, cross-origin rejection, unconfigured integrations, and expired/uncertain sandbox recovery. The final bundle is also imported and validated as a Worker ES module. All PayPal tests use fake transport; none calls PayPal.

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

MIT; see [LICENSE](LICENSE). Third-party APIs and services remain subject to their own terms. A custom-domain deployment is provided; completed sandbox transaction evidence is reported separately.

PayPal transports reject redirects before parsing provider bodies. Checkout capture requests ask for a full representation; a minimal successful capture is recovered by reading the same order once before exact verification. This recovery never creates a second capture request.
