'use strict';

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory session store (use a proper database in production)
const sessions = new Map();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ─── Raw body capture for Shopify webhook HMAC verification ──────────────────
// The HMAC is computed against the exact raw bytes Shopify sends.
// We capture the raw buffer in a verify callback before body-parser parses the
// body, then store it on req.rawBody so the webhook handler can use it.
app.use(
  bodyParser.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// ─── Shopify Config Route ──────────────────────────────────────────────────────
// Exposes non-secret Shopify config to the frontend
app.get('/api/shopify-config', (req, res) => {
  const domain = process.env.SHOPIFY_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!domain || !token) {
    return res.status(503).json({
      error: 'Shopify configuration is not set. Please configure environment variables.'
    });
  }

  res.json({
    domain,
    storefrontAccessToken: token
  });
});

// ─── Session / Credits API ─────────────────────────────────────────────────────
// Get or create a session (identified by a client-provided sessionId)
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { credits: 100, totalWins: 0, totalSpins: 0 });
  }

  res.json(sessions.get(sessionId));
});

// ─── Shopify Webhook – Order Paid ─────────────────────────────────────────────
// Shopify sends a POST here when an order is paid.
// We verify the HMAC signature using the raw request body, then credit the
// customer's session.
//
// Note: when a Shopify checkout is created with `customAttributes`, those
// attributes appear as `note_attributes` on the resulting order webhook payload.
app.post('/webhooks/orders/paid', (req, res) => {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('SHOPIFY_WEBHOOK_SECRET is not set – skipping HMAC verification');
  } else {
    if (!req.rawBody) {
      return res.status(400).json({ error: 'Missing raw request body for HMAC verification' });
    }

    const digest = crypto
      .createHmac('sha256', secret)
      .update(req.rawBody)
      .digest('base64');

    if (digest !== hmacHeader) {
      return res.status(401).json({ error: 'Unauthorized: invalid HMAC signature' });
    }
  }

  const order = req.body;
  // customAttributes on a Shopify checkout become note_attributes on the order
  const sessionAttr = (order.note_attributes || []).find(
    (attr) => attr.name === 'sessionId'
  );

  if (!sessionAttr) {
    return res.status(200).json({ message: 'No sessionId attribute found in order' });
  }

  const sessionId = sessionAttr.value;

  // Determine credits purchased from line items
  let creditsToAdd = 0;
  for (const item of order.line_items || []) {
    const credits = getCreditsForProduct(item.title, item.quantity);
    creditsToAdd += credits;
  }

  if (creditsToAdd > 0) {
    const session = sessions.get(sessionId) || { credits: 0, totalWins: 0, totalSpins: 0 };
    session.credits += creditsToAdd;
    sessions.set(sessionId, session);
    console.log(`Added ${creditsToAdd} credits to session ${sessionId}`);
  }

  res.status(200).json({ message: 'Webhook received', creditsAdded: creditsToAdd });
});

// ─── Helper: map product titles to credit amounts ─────────────────────────────
function getCreditsForProduct(title, quantity) {
  const normalized = (title || '').toLowerCase();
  let creditsPerUnit = 0;

  if (normalized.includes('starter pack') || normalized.includes('100 credits')) {
    creditsPerUnit = 100;
  } else if (normalized.includes('value pack') || normalized.includes('500 credits')) {
    creditsPerUnit = 500;
  } else if (normalized.includes('mega pack') || normalized.includes('1000 credits')) {
    creditsPerUnit = 1000;
  } else {
    // Default: 100 credits per purchased item
    creditsPerUnit = 100;
  }

  return creditsPerUnit * (quantity || 1);
}

// ─── Start server ─────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Casino Slot server running at http://localhost:${PORT}`);
    console.log('Configure your .env file with Shopify credentials to enable payments.');
  });
}

module.exports = app;
