import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWorkspace, ranked, currentQuote, fingerprint} from '../lib/procurement/domain.ts';
import {explainWithProvider} from '../lib/procurement/ai.ts';

const now = Date.parse('2026-10-02T12:00:00Z');
const config = {AI_MODE: 'openrouter', OPENROUTER_API_KEY: 'mock-key'};
const reply = (value: unknown) => Response.json({choices: [{finish_reason: 'stop',
  message: {role: 'assistant', content: JSON.stringify(value)}}]});

test('procurement explanation sends only fixture ranking and policy checks; private brief and targets stay local', async () => {
  const state = initialWorkspace();
  state.need.text = 'Private customer and purchasing brief';
  const originalQuote = await fingerprint(currentQuote(state));
  const result = await explainWithProvider(state.need, ranked(state).map(item => item.product), config,
    async (_, options) => {
      const body = JSON.parse(options.body as string);
      const input = JSON.parse(body.messages[1].content);
      assert.ok(!JSON.stringify(input).includes(state.need.text));
      assert.equal(input.need, undefined);
      assert.equal(input.budget, undefined);
      assert.equal(input.quantity, undefined);
      assert.ok(input.candidates.every((item: Record<string, unknown>) =>
        item.price === undefined && item.captureId === undefined && item.rank));
      return reply({summary: 'The first fixture offer meets the policy checks.'});
    }, now);
  assert.match(result.engine, /OpenRouter/);
  assert.equal(state.approval, null);
  assert.equal(await fingerprint(currentQuote(state)), originalQuote);
});

test('procurement AI cannot change price, bypass policy or execute checkout', async () => {
  const state = initialWorkspace(), before = JSON.stringify(state);
  const result = await explainWithProvider(state.need, ranked(state).map(item => item.product), config,
    async () => reply({summary: 'Buy now', price: 1, approve: true, action: 'checkout'}), now);
  assert.equal(result.engine, 'Deterministic rules');
  assert.ok(result.warning);
  assert.equal(JSON.stringify(state), before);
});

test('procurement provider errors return a sanitized rules explanation', async () => {
  const state = initialWorkspace();
  const result = await explainWithProvider(state.need, [], config,
    async () => { throw new Error('mock-key and private upstream body'); }, now);
  assert.equal(result.engine, 'Deterministic rules');
  assert.ok(!JSON.stringify(result).includes('mock-key'));
});

test('procurement only explains known fixture products', async () => {
  const state = initialWorkspace();
  const result = await explainWithProvider(state.need, [{...state.catalog[0], id: 'private-product'}], config,
    async () => assert.fail('Private inventory sent to provider'), now);
  assert.equal(result.engine, 'Deterministic rules');
  assert.ok(result.warning);
});
