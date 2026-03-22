'use strict';

const assert = require('assert');
const { evaluate, PAY_TABLE, TWO_CHERRY_MULTIPLIER } = require('../public/js/slot-machine');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2705  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  \u274C  ${name}: ${err.message}`);
    failed++;
  }
}

// ── evaluate() ───────────────────────────────────────────────────────────────

console.log('\nSlot Machine \u2013 Win Evaluation');

test('three cherries pays 3\u00d7 bet', () => {
  assert.strictEqual(evaluate(['\uD83C\uDF52', '\uD83C\uDF52', '\uD83C\uDF52'], 10), 30);
});

test('three lemons pays 4\u00d7 bet', () => {
  assert.strictEqual(evaluate(['\uD83C\uDF4B', '\uD83C\uDF4B', '\uD83C\uDF4B'], 10), 40);
});

test('three oranges pays 5\u00d7 bet', () => {
  assert.strictEqual(evaluate(['\uD83C\uDF4A', '\uD83C\uDF4A', '\uD83C\uDF4A'], 10), 50);
});

test('three grapes pays 6\u00d7 bet', () => {
  assert.strictEqual(evaluate(['\uD83C\uDF47', '\uD83C\uDF47', '\uD83C\uDF47'], 10), 60);
});

test('three stars pays 10\u00d7 bet', () => {
  assert.strictEqual(evaluate(['\u2B50', '\u2B50', '\u2B50'], 10), 100);
});

test('three diamonds pays 20\u00d7 bet', () => {
  assert.strictEqual(evaluate(['\uD83D\uDC8E', '\uD83D\uDC8E', '\uD83D\uDC8E'], 10), 200);
});

test('three 7s pays 50\u00d7 bet', () => {
  assert.strictEqual(evaluate(['7\uFE0F\u20E3', '7\uFE0F\u20E3', '7\uFE0F\u20E3'], 10), 500);
});

test('two cherries + other pays 2\u00d7 bet (partial win)', () => {
  assert.strictEqual(evaluate(['\uD83C\uDF52', '\uD83C\uDF52', '\uD83C\uDF4B'], 10), 20);
  assert.strictEqual(evaluate(['\uD83C\uDF52', '\uD83C\uDF47', '\uD83C\uDF52'], 10), 20);
  assert.strictEqual(evaluate(['\uD83C\uDF4B', '\uD83C\uDF52', '\uD83C\uDF52'], 10), 20);
});

test('one cherry pays 0', () => {
  assert.strictEqual(evaluate(['\uD83C\uDF52', '\uD83C\uDF4B', '\uD83C\uDF4A'], 10), 0);
});

test('no match pays 0', () => {
  assert.strictEqual(evaluate(['\uD83C\uDF4B', '\uD83C\uDF4A', '\uD83C\uDF47'], 10), 0);
});

test('different bet amount scales payout', () => {
  assert.strictEqual(evaluate(['\uD83D\uDC8E', '\uD83D\uDC8E', '\uD83D\uDC8E'], 25), 500);
});

// ── PAY_TABLE sanity ─────────────────────────────────────────────────────────
console.log('\nPay Table Sanity');

test('PAY_TABLE has entries for all 7 symbols', () => {
  const expected = ['\uD83C\uDF52', '\uD83C\uDF4B', '\uD83C\uDF4A', '\uD83C\uDF47', '\u2B50', '\uD83D\uDC8E', '7\uFE0F\u20E3'];
  for (const sym of expected) {
    assert.ok(PAY_TABLE[sym] > 0, `Missing or zero multiplier for ${sym}`);
  }
});

test('7 has the highest multiplier', () => {
  const max = Math.max(...Object.values(PAY_TABLE));
  assert.strictEqual(PAY_TABLE['7\uFE0F\u20E3'], max);
});

test('TWO_CHERRY_MULTIPLIER is positive', () => {
  assert.ok(TWO_CHERRY_MULTIPLIER > 0);
});

// ── Server Route Tests ────────────────────────────────────────────────────────
console.log('\nServer \u2013 Routes');

const http = require('http');
const crypto = require('crypto');

const TEST_PORT = 3099;

function getJSON(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${TEST_PORT}${urlPath}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    }).on('error', reject);
  });
}

function postJSON(urlPath, body, headers) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: TEST_PORT, path: urlPath, method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }, headers || {})
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

let testServer;

async function runServerTests() {
  const app = require('../server');
  testServer = app.listen(TEST_PORT);
  await new Promise((r) => setTimeout(r, 100));

  const newSessionId = 'test_' + Date.now();

  await (async () => {
    try {
      const { status, body } = await getJSON(`/api/session/${newSessionId}`);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.credits, 100);
      assert.strictEqual(body.totalSpins, 0);
      console.log('  \u2705  GET /api/session/:id creates new session with 100 credits');
      passed++;
    } catch (err) {
      console.error(`  \u274C  GET /api/session/:id creates new session: ${err.message}`);
      failed++;
    }
  })();

  await (async () => {
    try {
      const r1 = await getJSON(`/api/session/${newSessionId}`);
      const r2 = await getJSON(`/api/session/${newSessionId}`);
      assert.deepStrictEqual(r1.body, r2.body);
      console.log('  \u2705  GET /api/session/:id returns same session on repeat call');
      passed++;
    } catch (err) {
      console.error(`  \u274C  GET /api/session/:id repeat call: ${err.message}`);
      failed++;
    }
  })();

  await (async () => {
    try {
      const { status } = await getJSON('/api/shopify-config');
      assert.strictEqual(status, 503);
      console.log('  \u2705  GET /api/shopify-config returns 503 when env vars missing');
      passed++;
    } catch (err) {
      console.error(`  \u274C  GET /api/shopify-config 503: ${err.message}`);
      failed++;
    }
  })();

  await (async () => {
    try {
      process.env.SHOPIFY_DOMAIN = 'test.myshopify.com';
      process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = 'test-token';
      const { status, body } = await getJSON('/api/shopify-config');
      assert.strictEqual(status, 200);
      assert.strictEqual(body.domain, 'test.myshopify.com');
      assert.strictEqual(body.storefrontAccessToken, 'test-token');
      console.log('  \u2705  GET /api/shopify-config returns config when env vars set');
      passed++;
    } catch (err) {
      console.error(`  \u274C  GET /api/shopify-config with vars: ${err.message}`);
      failed++;
    } finally {
      delete process.env.SHOPIFY_DOMAIN;
      delete process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
    }
  })();

  // ── Webhook Tests ───────────────────────────────────────────────────────────
  console.log('\nServer \u2013 Webhook');

  await (async () => {
    try {
      delete process.env.SHOPIFY_WEBHOOK_SECRET;
      const sessionId = 'webhook_test_' + Date.now();
      const payload = {
        note_attributes: [{ name: 'sessionId', value: sessionId }],
        line_items: [{ title: 'Value Pack \u2013 500 Credits', quantity: 1 }]
      };
      const { status, body } = await postJSON('/webhooks/orders/paid', payload);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.creditsAdded, 500);
      const session = await getJSON(`/api/session/${sessionId}`);
      assert.strictEqual(session.body.credits, 500);
      console.log('  \u2705  POST /webhooks/orders/paid credits session (no HMAC secret)');
      passed++;
    } catch (err) {
      console.error(`  \u274C  POST /webhooks/orders/paid (no secret): ${err.message}`);
      failed++;
    }
  })();

  await (async () => {
    try {
      const secret = 'test-webhook-secret';
      process.env.SHOPIFY_WEBHOOK_SECRET = secret;
      const sessionId = 'webhook_hmac_' + Date.now();
      const payload = {
        note_attributes: [{ name: 'sessionId', value: sessionId }],
        line_items: [{ title: 'Mega Pack \u2013 1000 Credits', quantity: 1 }]
      };
      const rawBody = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
      const { status, body } = await postJSON('/webhooks/orders/paid', payload, {
        'x-shopify-hmac-sha256': hmac
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(body.creditsAdded, 1000);
      console.log('  \u2705  POST /webhooks/orders/paid accepts valid HMAC signature');
      passed++;
    } catch (err) {
      console.error(`  \u274C  POST /webhooks/orders/paid valid HMAC: ${err.message}`);
      failed++;
    } finally {
      delete process.env.SHOPIFY_WEBHOOK_SECRET;
    }
  })();

  await (async () => {
    try {
      process.env.SHOPIFY_WEBHOOK_SECRET = 'real-secret';
      const payload = { note_attributes: [], line_items: [] };
      const { status } = await postJSON('/webhooks/orders/paid', payload, {
        'x-shopify-hmac-sha256': 'invalid-hmac'
      });
      assert.strictEqual(status, 401);
      console.log('  \u2705  POST /webhooks/orders/paid rejects invalid HMAC signature');
      passed++;
    } catch (err) {
      console.error(`  \u274C  POST /webhooks/orders/paid invalid HMAC: ${err.message}`);
      failed++;
    } finally {
      delete process.env.SHOPIFY_WEBHOOK_SECRET;
    }
  })();

  testServer.close();

  console.log('\n─────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runServerTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
