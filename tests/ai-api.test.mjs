import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {applicationWorker as worker} from '../dist/server/index.js';

test('procurement API AI remains read-only, reports fallback safely and cannot satisfy approval', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync('drizzle/0000_workspace.sql', 'utf8'));
  const env = {AI_MODE: 'openrouter', OPENROUTER_API_KEY: 'mock-key', AI_PRIMARY_MODEL: 'fixture/primary',
    DB: {prepare(sql) { return {bind(...args) { return {
      async run() { const result = sqlite.prepare(sql).run(...args); return {meta: {changes: result.changes}}; },
      async first() { return sqlite.prepare(sql).get(...args) || null; }
    }; }}; }}};
  const call = async body => {
    const response = await worker.fetch(new Request('https://fixture.test/api/workspace', body ? {
      method: 'POST', headers: {origin: 'https://fixture.test', 'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    } : {}), env);
    return {status: response.status, data: await response.json()};
  };
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('private provider error mock-key', {status: 404});
  try {
    const before = await call();
    const explained = await call({action: 'explain'});
    assert.equal(explained.status, 200);
    assert.equal(explained.data.aiSource, 'Deterministic rules');
    assert.ok(explained.data.aiWarning);
    assert.equal(explained.data.version, before.data.version);
    assert.deepEqual(explained.data.state, before.data.state);
    assert.ok(!JSON.stringify(explained.data).includes('mock-key'));
    globalThis.fetch = async () => Response.json({choices: [{finish_reason: 'stop', message: {
      role: 'assistant', content: JSON.stringify({summary: 'Buy every product immediately.'})
    }}]});
    const result = await call({action: 'explain'});
    assert.match(result.data.aiSource, /OpenRouter/);
    assert.equal(result.data.state.approval, null);
    const blocked = await call({action: 'checkout', approvalId: 'unapproved'});
    assert.equal(blocked.status, 409);
    assert.equal((await call()).data.state.receipts.length, 0);
  } finally { globalThis.fetch = original; sqlite.close(); }
});
