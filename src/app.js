// Minimal slot machine logic
const symbols = ['🍒','🍋','🍊','🍉','⭐','🔔'];

const reelEls = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];
const balanceEl = document.getElementById('balance');
const betEl = document.getElementById('bet');
const spinBtn = document.getElementById('spin');
const resetBtn = document.getElementById('reset');
const msgEl = document.getElementById('message');

// Use virtual coins only. No real money.
let balance = 1000;
let spinning = false;

function randInt(max){ return Math.floor(Math.random()*max); }

function spinOnce(){
  if(spinning) return;
  const bet = Math.max(1, Math.floor(Number(betEl.value) || 1));
  if(bet > balance){ msgEl.textContent = 'Insufficient coins for that bet.'; return; }

  spinning = true;
  balance -= bet;
  updateBalance();
  msgEl.textContent = 'Spinning...';

  // simple staggered stops
  const results = [null,null,null];
  reelEls.forEach((el,i)=>{
    const spins = 12 + i*8 + randInt(8);
    let count = 0;
    const t = setInterval(()=>{
      el.textContent = symbols[randInt(symbols.length)];
      count++;
      if(count>=spins){
        clearInterval(t);
        results[i]=el.textContent;
        // when all done, evaluate
        if(results.every(r=>r!==null)){
          evaluate(results, bet);
          spinning=false;
        }
      }
    }, 80);
  });
}

function evaluate(results, bet){
  // payouts (in virtual coins): three of a kind x10, two of a kind x2, star (⭐) jackpot x20
  const counts = {};
  results.forEach(s=>counts[s]=(counts[s]||0)+1);
  let payout = 0;

  if(results.every(r=>r==='⭐')) payout = bet*20;
  else if(Object.values(counts).includes(3)) payout = bet*10;
  else if(Object.values(counts).includes(2)) payout = bet*2;

  balance += payout;
  updateBalance();
  if(payout>0) msgEl.textContent = `You won $${payout}!`;
  else msgEl.textContent = 'No win. Try again.';
}

function updateBalance(){ balanceEl.textContent = String(balance); }

spinBtn.addEventListener('click', spinOnce);
resetBtn.addEventListener('click', ()=>{ balance=100; updateBalance(); msgEl.textContent='Balance reset.' });

updateBalance();
