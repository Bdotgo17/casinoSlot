// ── Symbols & pay table ──────────────────────────────────────
const SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎', '7️⃣'];

// Weighted pool: common symbols appear more often
const POOL = [
  '🍒', '🍒', '🍒', '🍒',
  '🍋', '🍋', '🍋',
  '🍇', '🍇', '🍇',
  '🔔', '🔔',
  '⭐', '⭐',
  '💎',
  '7️⃣',
];

const PAYOUTS = {
  '🍒🍒🍒': 5,
  '🍋🍋🍋': 8,
  '🍇🍇🍇': 10,
  '🔔🔔🔔': 15,
  '⭐⭐⭐': 20,
  '💎💎💎': 50,
  '7️⃣7️⃣7️⃣': 100,
};

// ── State ────────────────────────────────────────────────────
let credits = 100;
let bet = 10;
let spinning = false;

// ── DOM refs ─────────────────────────────────────────────────
const creditsEl  = document.getElementById('credits');
const betEl      = document.getElementById('bet-display');
const messageEl  = document.getElementById('message');
const spinBtn    = document.getElementById('spin-btn');
const betUpBtn   = document.getElementById('bet-up');
const betDownBtn = document.getElementById('bet-down');
const machineEl  = document.querySelector('.machine');

const reelEls = [
  document.getElementById('reel1'),
  document.getElementById('reel2'),
  document.getElementById('reel3'),
];

// ── Helpers ──────────────────────────────────────────────────
function randomSymbol() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

function setSymbol(reelEl, symbol) {
  reelEl.querySelector('.symbol').textContent = symbol;
}

function updateUI() {
  creditsEl.textContent = credits;
  betEl.textContent = bet;
  betDownBtn.disabled = bet <= 5 || spinning;
  betUpBtn.disabled   = bet >= credits || spinning;
  spinBtn.disabled    = spinning || credits < bet;
}

function setMessage(text, cls = '') {
  messageEl.textContent = text;
  messageEl.className = 'message ' + cls;
}

// ── Evaluate result ──────────────────────────────────────────
function evaluate(results) {
  const key = results.join('');

  // Three of a kind
  if (PAYOUTS[key]) {
    return { multiplier: PAYOUTS[key], label: '🎉 JACKPOT! Three of a kind!' };
  }

  // Two of a kind
  const [a, b, c] = results;
  if (a === b || b === c || a === c) {
    return { multiplier: 2, label: '✨ Two of a kind!' };
  }

  return { multiplier: 0, label: '😞 No match. Try again!' };
}

// ── Spin animation ───────────────────────────────────────────
function spinReel(reelEl, finalSymbol, delay) {
  return new Promise(resolve => {
    // Show spinning animation
    reelEl.classList.add('spinning');

    setTimeout(() => {
      reelEl.classList.remove('spinning');
      setSymbol(reelEl, finalSymbol);
      resolve();
    }, delay);
  });
}

// ── Main spin logic ──────────────────────────────────────────
async function spin() {
  if (spinning || credits < bet) return;

  spinning = true;
  updateUI();

  credits -= bet;
  updateUI();

  setMessage('Spinning…');
  machineEl.classList.remove('win-flash');

  // Pick final symbols
  const results = [randomSymbol(), randomSymbol(), randomSymbol()];

  // Animate each reel with staggered stops
  await Promise.all([
    spinReel(reelEls[0], results[0], 600),
    spinReel(reelEls[1], results[1], 900),
    spinReel(reelEls[2], results[2], 1200),
  ]);

  // Evaluate
  const { multiplier, label } = evaluate(results);

  if (multiplier > 0) {
    const winAmount = bet * multiplier;
    credits += winAmount;
    setMessage(`${label}  +${winAmount} credits!`, 'win');
    machineEl.classList.add('win-flash');
  } else {
    setMessage(label, 'lose');
  }

  // Game-over guard
  if (credits <= 0) {
    credits = 0;
    setMessage('💸 Out of credits! Game reset.', 'lose');
    setTimeout(() => {
      credits = 100;
      bet = 10;
      spinning = false;
      setMessage('Press SPIN to play!');
      updateUI();
    }, 2500);
  }

  spinning = false;
  updateUI();
}

// ── Bet controls ─────────────────────────────────────────────
betUpBtn.addEventListener('click', () => {
  if (bet + 5 <= credits) {
    bet += 5;
    updateUI();
  }
});

betDownBtn.addEventListener('click', () => {
  if (bet - 5 >= 5) {
    bet -= 5;
    updateUI();
  }
});

spinBtn.addEventListener('click', spin);

// Allow spacebar to spin
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !spinBtn.disabled) {
    e.preventDefault();
    spin();
  }
});

// ── Init ─────────────────────────────────────────────────────
updateUI();
