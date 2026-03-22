# casinoSlot 🎰

A slot machine web app with **Shopify payment integration** for purchasing credits.

## Features

- 🎰 3-reel slot machine with 7 symbols and weighted probabilities
- 🏆 Win table: 3-of-a-kind payouts (3× – 50×) + two-cherry partial win
- 💳 **Shopify Buy Button** integration – customers purchase credit packs
- 🔒 Shopify webhook HMAC verification for secure order fulfillment
- 🎯 Session-based credit tracking (credits auto-credited after purchase)
- 📱 Responsive design

## Credit Packs (Shopify Products)

| Pack | Credits | Price |
|------|---------|-------|
| Starter 🎰 | 100 | $0.99 |
| Value 💰 | 500 | $3.99 |
| Mega 💎 | 1,000 | $6.99 |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your Shopify credentials

# 3. Start the server
npm start
# Open http://localhost:3000
```

## Shopify Setup

1. **Create a Shopify store** at [shopify.com](https://shopify.com)

2. **Create three products** in your Shopify admin:
   - "Starter Pack – 100 Credits" – $0.99
   - "Value Pack – 500 Credits" – $3.99
   - "Mega Pack – 1000 Credits" – $6.99

3. **Get your Storefront API credentials**:
   - Shopify Admin → Settings → Apps and sales channels → Develop apps
   - Create a new app → Configure Storefront API → copy the access token

4. **Configure webhooks**:
   - Shopify Admin → Settings → Notifications → Webhooks
   - Add webhook: `orders/paid` → `https://YOUR_DOMAIN/webhooks/orders/paid`
   - Copy the webhook secret

5. **Update `.env`**:
   ```
   SHOPIFY_DOMAIN=your-store.myshopify.com
   SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-token
   SHOPIFY_WEBHOOK_SECRET=your-webhook-secret
   ```

6. **Update product variant IDs** in `public/js/shopify.js`:
   ```js
   variantId: 'gid://shopify/ProductVariant/YOUR_VARIANT_ID'
   ```

## How It Works

```
Customer plays → runs out of credits
    → clicks "Buy More Credits"
    → selects a pack
    → Shopify checkout opens (new tab)
    → customer pays
    → Shopify sends webhook to /webhooks/orders/paid
    → server verifies HMAC & credits the session
    → when customer returns to tab, credits appear automatically
```

## Project Structure

```
├── server.js                 # Express server + Shopify webhook handler
├── public/
│   ├── index.html            # Slot machine UI
│   ├── css/style.css         # Styles
│   └── js/
│       ├── slot-machine.js   # Game logic (evaluate, spin, animations)
│       └── shopify.js        # Shopify Buy Button SDK integration
├── tests/
│   └── slot-machine.test.js  # Unit + integration tests
├── .env.example              # Environment variable template
└── package.json
```

## Running Tests

```bash
npm test
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SHOPIFY_DOMAIN` | Your Shopify store domain (e.g. `my-store.myshopify.com`) |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Storefront API access token |
| `SHOPIFY_WEBHOOK_SECRET` | Webhook HMAC secret for order verification |
| `PORT` | Server port (default: 3000) |

> ⚠️ **18+ Only. Play Responsibly. This is a demo application.**
