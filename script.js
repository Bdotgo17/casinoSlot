/* ─── Casino Slot Machine ─── */

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣', '🃏'];

// Pay table: [symbol or combo key] -> multiplier (applied to bet)
const PAYTABLE = [
  { match: '7️⃣', count: 3, multiplier: 50,  label: 'JACKPOT' },
  { match: '💎', count: 3, multiplier: 25,  label: 'BIG WIN'  },
  { match: '⭐', count: 3, multiplier: 15,  label: 'GREAT!'   },
  { match: '🔔', count: 3, multiplier: 10,  label: 'NICE!'    },
  { match: '🍇', count: 3, multiplier:  8,  label: 'WIN!'     },
  { match: '🍊', count: 3, multiplier:  6,  label: 'WIN!'     },
  { match: '🍋', count: 3, multiplier:  4,  label: 'WIN!'     },
  { match: '🍒', count: 3, multiplier:  3,  label: 'WIN!'     },
  { match: '🃏', count: 3, multiplier:  2,  label: 'WIN!'     },
  // Two-of-a-kind
  { match: '7️⃣', count: 2, multiplier:  5,  label: 'LUCKY!'   },
  { match: '💎', count: 2, multiplier:  3,  label: 'LUCKY!'   },
  { match: '⭐', count: 2, multiplier:  2,  label: 'LUCKY!'   },
  { match: '🍒', count: 2, multiplier:  1,  label: 'LUCKY!'   },
];

const BET_OPTIONS = [1, 2, 5, 10, 25];

// ── State ──
let credits = 100;
let betIndex = 1;
let spinning = false;
let finalSymbols = ['🍒', '🍒', '🍒'];

// ── DOM refs ──
const creditEl  = document.getElementById('credits');
const winEl     = document.getElementById('win-amount');
const msgEl     = document.getElementById('win-message');
const betAmtEl  = document.getElementById('bet-amount');
const spinBtn   = document.getElementById('spin-btn');
const reelEls   = [
  document.getElementById('reel-0'),
  document.getElementById('reel-1'),
  document.getElementById('reel-2'),
];
const paytableEl = document.getElementById('paytable');

// ── Helpers ──
function getBet() { return BET_OPTIONS[betIndex]; }

function updateUI() {
  creditEl.textContent = credits;
  betAmtEl.textContent = getBet();
}

function randomSymbol() {
  // Weighted: common fruits more likely, jackpot symbols rare
  const weights = [12, 10, 10, 8, 8, 6, 4, 2, 3]; // matches SYMBOLS order
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[0];
}

// Build a strip of N random symbols followed by the target symbol
function buildStrip(targetSymbol, extraRows = 18) {
  const strip = [];
  for (let i = 0; i < extraRows; i++) strip.push(randomSymbol());
  strip.push(targetSymbol);
  return strip;
}

// ── Spin one reel ──
function spinReel(reelEl, targetSymbol, duration) {
  return new Promise(resolve => {
    const strip = buildStrip(targetSymbol);
    const stripEl = reelEl.querySelector('.reel-strip');
    const symbolH = reelEl.offsetHeight; // 130 px

    // Populate strip
    stripEl.innerHTML = '';
    strip.forEach(sym => {
      const div = document.createElement('div');
      div.className = 'symbol';
      div.textContent = sym;
      stripEl.appendChild(div);
    });

    // Start at top (first symbol visible)
    let currentPos = 0;
    stripEl.style.transform = `translateY(0px)`;

    const totalDistance = (strip.length - 1) * symbolH;
    const startTime = performance.now();

    reelEl.classList.add('spinning');

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const pos = -(eased * totalDistance);
      stripEl.style.transform = `translateY(${pos}px)`;

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        reelEl.classList.remove('spinning');
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

// ── Check win ──
function checkWin(syms) {
  for (const entry of PAYTABLE) {
    const matchCount = syms.filter(s => s === entry.match).length;
    if (matchCount >= entry.count) {
      return entry;
    }
  }
  return null;
}

// ── Coin shower ──
function coinShower(count = 20) {
  for (let i = 0; i < count; i++) {
    const coin = document.createElement('div');
    coin.className = 'coin';
    coin.textContent = '🪙';
    coin.style.left = `${Math.random() * 100}vw`;
    coin.style.animationDuration = `${0.8 + Math.random() * 1.2}s`;
    coin.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(coin);
    coin.addEventListener('animationend', () => coin.remove());
  }
}

// ── Spin handler ──
async function doSpin() {
  if (spinning) return;
  const bet = getBet();
  if (credits < bet) {
    msgEl.textContent = '⚠️ Not enough credits!';
    msgEl.className = 'win-message';
    return;
  }

  spinning = true;
  spinBtn.disabled = true;
  msgEl.textContent = '';
  msgEl.className = 'win-message';
  winEl.textContent = '0';

  credits -= bet;
  updateUI();

  // Determine outcomes
  finalSymbols = [randomSymbol(), randomSymbol(), randomSymbol()];

  // Staggered durations
  const durations = [900, 1200, 1500];

  await Promise.all(
    reelEls.map((el, i) => spinReel(el, finalSymbols[i], durations[i]))
  );

  // Evaluate
  const win = checkWin(finalSymbols);
  if (win) {
    const payout = win.multiplier * bet;
    credits += payout;
    winEl.textContent = payout;
    updateUI();

    if (win.multiplier >= 25) {
      msgEl.className = 'win-message jackpot';
      msgEl.textContent = `🎉 ${win.label} +${payout} credits! 🎉`;
      coinShower(40);
    } else {
      msgEl.className = 'win-message';
      msgEl.textContent = `✨ ${win.label}  +${payout} credits!`;
      coinShower(12);
    }
  } else {
    msgEl.textContent = 'Try again!';
  }

  spinning = false;
  spinBtn.disabled = false;
}

// ── Bet controls ──
document.getElementById('bet-up').addEventListener('click', () => {
  betIndex = Math.min(betIndex + 1, BET_OPTIONS.length - 1);
  updateUI();
});
document.getElementById('bet-down').addEventListener('click', () => {
  betIndex = Math.max(betIndex - 1, 0);
  updateUI();
});

// ── Spin button ──
spinBtn.addEventListener('click', doSpin);

// ── Keyboard shortcut (Space / Enter) ──
document.addEventListener('keydown', e => {
  if ((e.code === 'Space' || e.code === 'Enter') && !spinning) {
    e.preventDefault();
    doSpin();
  }
});

// ── Paytable toggle ──
document.getElementById('paytable-toggle').addEventListener('click', () => {
  paytableEl.classList.toggle('open');
  document.getElementById('paytable-toggle').textContent =
    paytableEl.classList.contains('open') ? 'Hide pay table ▲' : 'View pay table ▼';
});

// ── Init ──
// Place initial symbols in each reel
reelEls.forEach((reelEl, i) => {
  const stripEl = reelEl.querySelector('.reel-strip');
  const div = document.createElement('div');
  div.className = 'symbol';
  div.textContent = finalSymbols[i];
  stripEl.appendChild(div);
});

updateUI();
