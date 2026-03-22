'use strict';

// ── Symbols & Pay Table ─────────────────────────────────────────────────────
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];

// Win multipliers for three-of-a-kind (applied to bet amount)
const PAY_TABLE = {
  '🍒': 3,
  '🍋': 4,
  '🍊': 5,
  '🍇': 6,
  '⭐': 10,
  '💎': 20,
  '7️⃣': 50
};

// Two-cherry partial win multiplier
const TWO_CHERRY_MULTIPLIER = 2;

// ── Utilities (pure, no DOM) ──────────────────────────────────────────────────
function randomSymbol() {
  // Weighted distribution – diamonds and 7s are rarer
  const weights = [20, 18, 16, 14, 10, 6, 3]; // matches SYMBOLS order
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= weights[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[0];
}

function getOrCreateSessionId() {
  if (typeof localStorage === 'undefined') return 'server-session';
  let id = localStorage.getItem('casinoSessionId');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('casinoSessionId', id);
  }
  return id;
}

// ── Win Evaluation ────────────────────────────────────────────────────────────
function evaluate(symbols, bet) {
  const [a, b, c] = symbols;

  // Three of a kind
  if (a === b && b === c) {
    return bet * PAY_TABLE[a];
  }

  // Two cherries (partial win)
  const cherries = symbols.filter((s) => s === '🍒').length;
  if (cherries >= 2) {
    return bet * TWO_CHERRY_MULTIPLIER;
  }

  return 0;
}

// ── Browser-only code ─────────────────────────────────────────────────────────
if (typeof document !== 'undefined') {
  // ── Game State ──────────────────────────────────────────────────────────────
  const state = {
    credits: 100,
    bet: 10,
    spinning: false,
    totalWins: 0,
    totalSpins: 0,
    sessionId: getOrCreateSessionId()
  };

  // ── DOM References ──────────────────────────────────────────────────────────
  const reelEls = [
    document.getElementById('reel-0'),
    document.getElementById('reel-1'),
    document.getElementById('reel-2')
  ];

  const creditsEl = document.getElementById('credits-display');
  const betEl     = document.getElementById('bet-amount');
  const spinBtn   = document.getElementById('spin-btn');
  const resultEl  = document.getElementById('result-message');
  const winsEl    = document.getElementById('wins-display');
  const spinsEl   = document.getElementById('spins-display');

  // ── Init ─────────────────────────────────────────────────────────────────────
  (async function init() {
    try {
      const res = await fetch(`/api/session/${state.sessionId}`);
      if (res.ok) {
        const data = await res.json();
        state.credits    = data.credits;
        state.totalWins  = data.totalWins;
        state.totalSpins = data.totalSpins;
      }
    } catch {
      // Server may not be running; use defaults
    }

    updateUI();
    renderReels(['7️⃣', '7️⃣', '7️⃣']);
  })();

  // ── Core Spin Logic ──────────────────────────────────────────────────────────
  spinBtn.addEventListener('click', spin);

  async function spin() {
    if (state.spinning) return;
    if (state.credits < state.bet) {
      showResult('Not enough credits! Buy more below. 👇', false);
      document.getElementById('buy-credits-btn').classList.add('pulse');
      setTimeout(() => document.getElementById('buy-credits-btn').classList.remove('pulse'), 1500);
      return;
    }

    state.spinning = true;
    state.credits -= state.bet;
    state.totalSpins += 1;
    spinBtn.disabled = true;
    updateUI();
    showResult('', false);

    const finalSymbols = reelEls.map(() => randomSymbol());
    await animateReels(finalSymbols);

    const payout = evaluate(finalSymbols, state.bet);

    if (payout > 0) {
      state.credits += payout;
      state.totalWins += payout;
      const bigWin = payout >= state.bet * 10;
      showResult(
        bigWin
          ? `🎉 BIG WIN! +${payout} credits! 🎉`
          : `🏆 You won ${payout} credits!`,
        bigWin
      );
      highlightWinReels();
    } else {
      showResult('No luck this time. Spin again!', false);
    }

    updateUI();
    state.spinning = false;
    spinBtn.disabled = false;
  }

  // ── Reel Animation ──────────────────────────────────────────────────────────
  function animateReels(finalSymbols) {
    return new Promise((resolve) => {
      const SPIN_DURATION = [800, 1000, 1200];
      let finished = 0;

      reelEls.forEach((el, i) => {
        el.classList.add('spinning');
        el.classList.remove('win');
        const symbolEl = el.querySelector('.reel-symbol');

        const interval = setInterval(() => {
          symbolEl.textContent = randomSymbol();
        }, 80);

        setTimeout(() => {
          clearInterval(interval);
          el.classList.remove('spinning');
          symbolEl.textContent = finalSymbols[i];
          finished += 1;
          if (finished === reelEls.length) resolve();
        }, SPIN_DURATION[i]);
      });
    });
  }

  // ── UI Helpers ──────────────────────────────────────────────────────────────
  function updateUI() {
    creditsEl.textContent = state.credits.toLocaleString();
    betEl.textContent     = state.bet;
    winsEl.textContent    = state.totalWins.toLocaleString();
    spinsEl.textContent   = state.totalSpins.toLocaleString();
  }

  function renderReels(symbols) {
    reelEls.forEach((el, i) => {
      el.querySelector('.reel-symbol').textContent = symbols[i];
    });
  }

  function showResult(msg, bigWin) {
    resultEl.textContent = msg;
    resultEl.className = 'result-message' + (bigWin ? ' big-win' : '');
  }

  function highlightWinReels() {
    reelEls.forEach((el) => el.classList.add('win'));
    setTimeout(() => reelEls.forEach((el) => el.classList.remove('win')), 2500);
  }

  // ── Bet Controls ──────────────────────────────────────────────────────────
  document.getElementById('bet-decrease').addEventListener('click', () => {
    if (state.spinning) return;
    const options = [5, 10, 25, 50, 100];
    const idx = options.indexOf(state.bet);
    if (idx > 0) {
      state.bet = options[idx - 1];
      updateUI();
    }
  });

  document.getElementById('bet-increase').addEventListener('click', () => {
    if (state.spinning) return;
    const options = [5, 10, 25, 50, 100];
    const idx = options.indexOf(state.bet);
    if (idx < options.length - 1 && options[idx + 1] <= state.credits) {
      state.bet = options[idx + 1];
      updateUI();
    }
  });
}

// Export for testing (Node.js)
if (typeof module !== 'undefined') {
  module.exports = { evaluate, PAY_TABLE, TWO_CHERRY_MULTIPLIER };
}

