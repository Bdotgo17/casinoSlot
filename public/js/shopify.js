'use strict';

// ── Shopify Buy Button Integration ───────────────────────────────────────────
// Uses the official Shopify Buy Button JS SDK to render a checkout button
// for each credit pack. When a customer completes a purchase, the server-side
// webhook (/webhooks/orders/paid) credits their session automatically.

// Credit pack product variants – map these to real Shopify product variant IDs
// obtained from your Shopify admin after you create the products.
const CREDIT_PACKS = [
  {
    id: 'starter',
    label: '100 Credits',
    emoji: '🎰',
    credits: 100,
    price: '$0.99',
    // Replace with the actual Shopify product variant ID for this pack
    variantId: null
  },
  {
    id: 'value',
    label: '500 Credits',
    emoji: '💰',
    credits: 500,
    price: '$3.99',
    popular: true,
    variantId: null
  },
  {
    id: 'mega',
    label: '1000 Credits',
    emoji: '💎',
    credits: 1000,
    price: '$6.99',
    variantId: null
  }
];

// ── Module State ─────────────────────────────────────────────────────────────
let shopifyClient  = null;
let selectedPack   = CREDIT_PACKS[1]; // default to value pack
let shopifyReady   = false;

// ── Init Shop ─────────────────────────────────────────────────────────────────
async function initShopify() {
  const warningEl = document.getElementById('shopify-config-warning');

  let config;
  try {
    const res = await fetch('/api/shopify-config');
    if (!res.ok) throw new Error('Config not available');
    config = await res.json();
    if (config.error) throw new Error(config.error);
  } catch (err) {
    // Show demo mode if Shopify is not configured
    showConfigWarning(warningEl, err.message);
    setupDemoCheckout();
    return;
  }

  // Load the Shopify Buy Button SDK dynamically
  if (typeof ShopifyBuy === 'undefined') {
    await loadScript('https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js');
  }

  try {
    shopifyClient = ShopifyBuy.buildClient({
      domain: config.domain,
      storefrontAccessToken: config.storefrontAccessToken
    });
    shopifyReady = true;
    renderShopifyButton();
  } catch (err) {
    showConfigWarning(warningEl, 'Failed to initialize Shopify: ' + err.message);
    setupDemoCheckout();
  }
}

// ── Render Shopify Buy Button ─────────────────────────────────────────────────
function renderShopifyButton() {
  const container = document.getElementById('shopify-buy-container');
  container.innerHTML = '<button id="shopify-checkout-btn" class="spin-btn" style="background:linear-gradient(135deg,#7c3aed,#4c1d95);margin-bottom:0">Checkout with Shopify 🛒</button>';
  document.getElementById('shopify-checkout-btn').addEventListener('click', () =>
    handleShopifyCheckout()
  );
}

// ── Handle Checkout ────────────────────────────────────────────────────────────
async function handleShopifyCheckout() {
  if (!shopifyReady || !shopifyClient) return;

  const variantId = selectedPack.variantId;
  if (!variantId) {
    showToast('⚠️ Product variant ID not configured. See README.');
    return;
  }

  // Retrieve the current session ID so the webhook can credit this session
  const sessionId = localStorage.getItem('casinoSessionId') || 'unknown';

  try {
    // Create a checkout with a custom attribute to track the session
    const checkout = await shopifyClient.checkout.create({
      customAttributes: [{ key: 'sessionId', value: sessionId }],
      lineItems: [{ variantId, quantity: 1 }]
    });

    // Open Shopify checkout in a new tab
    window.open(checkout.webUrl, '_blank');
    showToast('Opening Shopify checkout… 🛒');
  } catch (err) {
    showToast('Checkout error: ' + err.message);
  }
}

// ── Pack Selection ────────────────────────────────────────────────────────────
function selectPack(packId) {
  selectedPack = CREDIT_PACKS.find((p) => p.id === packId) || CREDIT_PACKS[1];

  document.querySelectorAll('.pack-card').forEach((card) => {
    card.classList.toggle('selected', card.dataset.packId === packId);
  });
}

// ── Demo Mode (no Shopify config) ─────────────────────────────────────────────
function setupDemoCheckout() {
  const container = document.getElementById('shopify-buy-container');
  container.innerHTML = `
    <div style="text-align:center;padding:12px">
      <p style="color:#a78bfa;font-size:0.8rem;margin-bottom:10px">
        Demo Mode – Shopify not configured.<br>
        Credits added for free in demo.
      </p>
      <button id="demo-buy-btn" class="spin-btn" style="background:linear-gradient(135deg,#7c3aed,#4c1d95);margin-bottom:0;padding:10px">
        🎁 Get ${selectedPack.credits} Credits (Demo)
      </button>
    </div>`;

  document.getElementById('demo-buy-btn').addEventListener('click', () => {
    addCreditsDemo(selectedPack.credits);
  });
}

function addCreditsDemo(credits) {
  // Directly update the game state in demo mode
  if (typeof state !== 'undefined') {
    state.credits += credits;
    updateUI();
    showToast(`+${credits} credits added (demo mode)! 🎰`);
    closeShopModal();
  }
}

// ── Modal Controls ────────────────────────────────────────────────────────────
document.getElementById('buy-credits-btn').addEventListener('click', openShopModal);
document.getElementById('modal-close').addEventListener('click', closeShopModal);
document.getElementById('shop-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeShopModal();
});

function openShopModal() {
  document.getElementById('shop-modal').classList.add('active');
  if (!shopifyReady) initShopify();
}

function closeShopModal() {
  document.getElementById('shop-modal').classList.remove('active');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

function showConfigWarning(el, msg) {
  if (!el) return;
  el.textContent = '⚠️ Shopify not configured: ' + msg;
  el.classList.add('visible');
}

// ── Poll for credits after checkout ──────────────────────────────────────────
// After a user returns from Shopify checkout, poll the server for credit update
window.addEventListener('focus', async () => {
  if (typeof state === 'undefined') return;
  try {
    const res = await fetch(`/api/session/${state.sessionId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.credits > state.credits) {
        const diff = data.credits - state.credits;
        state.credits   = data.credits;
        state.totalWins = data.totalWins;
        updateUI();
        showToast(`+${diff} credits added to your account! 🎰`);
      }
    }
  } catch {
    // Server not running or network issue; silently ignore
  }
});
