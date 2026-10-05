import {initialWorkspace, violations, type Need, type Product} from './domain.ts';
import type {RuntimeEnv} from './store.ts';
import {aiConfigured, requestAI, AI_PUBLIC_WARNING, AI_SUMMARY_SCHEMA, validateAISummary} from './ai-provider.mjs';

// Explanation only. Free-text briefs, budgets, quantities, payment data and IDs stay local.
export async function explainWithProvider(need: Need, candidates: Product[], env: RuntimeEnv,
  fetcher = fetch, now = Date.now()) {
  const deterministic = {text: 'The shortlist uses fixture inventory and your saved purchasing constraints. Review the displayed delivered totals before approving.',
    engine: 'Deterministic rules'};
  if (!aiConfigured(env)) return deterministic;
  try {
    const fixtures = initialWorkspace().catalog;
    const safeCandidates = candidates.map((product, index) => {
      const fixture = fixtures.find(item => item.id === product.id);
      if (!fixture) throw new Error('Only fixture catalog entries can be explained.');
      return {name: fixture.name, seller: fixture.seller, rank: index + 1,
        deliveryDays: fixture.delivery, lowWaste: fixture.eco, policyIssues: violations(product, need)};
    });
    const result = await requestAI(env,
      'Explain the supplied fictional shortlist ranking and policy checks in at most 90 words. ' +
      'Return {"summary":"..."}. Use only supplied facts. Never invent prices or stock, change policy, approve or execute checkout.',
      {syntheticDemo: true, candidates: safeCandidates},
      AI_SUMMARY_SCHEMA, validateAISummary, fetcher, now);
    return {text: result.value.summary,
      engine: 'OpenRouter / ' + result.model + (result.fallbackUsed ? ' (paid fallback)' : '')};
  } catch {
    return {...deterministic, warning: AI_PUBLIC_WARNING};
  }
}
