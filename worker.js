// MAKE A MILLY OR IT'S EMBARRASSING
// Horse race: King Omar vs Basic Rhys vs Pussy vs Patty
// Last to $1M is confirmed gay

const GOAL = 1_000_000;
const STRIPE_KEY_SECRET = null; // Omar's revenue comes from KV metrics

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API: update a competitor's revenue (each person calls this with their own secret)
    if (url.pathname === '/update' && request.method === 'POST') {
      const auth = request.headers.get('Authorization');
      const { competitor, revenue } = await request.json();
      const validKeys = {
        rhys:  env.RHYS_SECRET,
        pussy: env.PUSSY_SECRET,
        patty: env.PATTY_SECRET,
        omar:  env.OMAR_SECRET,
      };
      if (!validKeys[competitor] || auth !== `Bearer ${validKeys[competitor]}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      const comps = JSON.parse(await env.MILLY_METRICS.get('competitors') || '{}');
      if (comps[competitor]) comps[competitor].revenue = parseFloat(revenue) || 0;
      await env.MILLY_METRICS.put('competitors', JSON.stringify(comps));
      return new Response('OK');
    }

    // Pull Omar's live revenue from metrics KV (updated by weekly agent)
    const [compsRaw, metricsRaw, baselineRaw] = await Promise.all([
      env.MILLY_METRICS.get('competitors'),
      env.MILLY_METRICS.get('metrics'),
      env.MILLY_METRICS.get('baseline'),
    ]);

    const competitors = compsRaw ? JSON.parse(compsRaw) : {};
    const metrics = metricsRaw ? JSON.parse(metricsRaw) : {};
    const baseline = baselineRaw ? JSON.parse(baselineRaw).amount : 0;

    // Omar's revenue comes from the live Stripe metrics
    if (competitors.omar) {
      competitors.omar.revenue = metrics.total_revenue || 0;
    }

    return new Response(render(competitors), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store' }
    });
  }
};

function pct(revenue) {
  return Math.min((revenue / GOAL) * 100, 100);
}

function fmt(n) {
  if (n >= 1e6) return `$${(n/1e6).toFixed(3)}M`;
  if (n >= 1000) return `$${(n/1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function render(competitors) {
  const sorted = Object.entries(competitors).sort((a, b) => b[1].revenue - a[1].revenue);
  const leader = sorted[0];
  const loser = sorted[sorted.length - 1];

  // Build horse positions
  const horses = Object.entries(competitors).map(([id, c]) => ({
    id, ...c,
    pct: pct(c.revenue),
    done: c.revenue >= GOAL
  }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>MAKE A MILLY OR IT'S EMBARRASSING 🏇</title>
<meta http-equiv="refresh" content="60"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;800;900&display=swap');

*{margin:0;padding:0;box-sizing:border-box}
html,body{min-height:100vh;background:#0a0400;color:#fff;font-family:'Inter',sans-serif;overflow-x:hidden}

/* HEADER */
.title-block{text-align:center;padding:40px 20px 20px;position:relative}
.main-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,8vw,90px);line-height:0.95;
  background:linear-gradient(135deg,#fbbf24,#f59e0b,#ef4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;
  letter-spacing:2px}
.stakes{display:inline-block;background:#ef4444;color:#fff;font-size:clamp(12px,2vw,18px);
  font-weight:800;padding:8px 24px;border-radius:100px;margin-top:12px;text-transform:uppercase;letter-spacing:2px;
  animation:pulse-red 2s ease-in-out infinite}
@keyframes pulse-red{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)}50%{box-shadow:0 0 20px 6px rgba(239,68,68,0)}}
.subtitle{color:#78350f;font-size:14px;margin-top:10px;letter-spacing:1px;text-transform:uppercase}

/* RACE TRACK */
.race-container{padding:20px 20px 10px;max-width:1200px;margin:0 auto}

.track{background:linear-gradient(180deg,#1a0e00,#0d0700);border:2px solid #3b1c00;border-radius:20px;
  overflow:hidden;position:relative;padding:20px 0}
.track::before{content:'';position:absolute;inset:0;
  background:repeating-linear-gradient(90deg,transparent,transparent 49%,rgba(255,255,255,0.02) 50%,rgba(255,255,255,0.02) 51%);
  pointer-events:none}

/* Track dirt texture */
.track-lane{position:relative;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.04)}
.track-lane:last-child{border-bottom:none}

/* Lane number */
.lane-num{position:absolute;left:8px;top:50%;transform:translateY(-50%);
  width:24px;height:24px;border-radius:50%;background:#1f1000;
  border:1px solid #3b2000;color:#78350f;font-size:11px;font-weight:700;
  display:flex;align-items:center;justify-content:center}

/* Horse track bar */
.horse-track{display:flex;align-items:center;gap:12px;padding-left:36px}

/* Competitor info */
.comp-info{min-width:140px;flex-shrink:0}
.comp-name{font-size:15px;font-weight:800;line-height:1}
.comp-ai{font-size:11px;font-weight:600;opacity:0.5;text-transform:uppercase;letter-spacing:1px;margin-top:2px}
.comp-rev{font-size:18px;font-weight:900;margin-top:4px}

/* Progress track */
.progress-track{flex:1;position:relative;height:48px;background:#0a0500;
  border-radius:100px;overflow:hidden;border:1px solid rgba(255,255,255,0.05)}

/* Dirt track texture inside bar */
.progress-track::before{
  content:'';position:absolute;inset:0;
  background:repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(255,255,255,0.015) 20px);
  pointer-events:none;z-index:0
}

/* Progress fill */
.progress-fill{position:absolute;top:0;left:0;height:100%;border-radius:100px;
  transition:width 1.5s cubic-bezier(0.4,0,0.2,1);min-width:0;z-index:1;
  background:linear-gradient(90deg,var(--color),color-mix(in srgb,var(--color) 70%,#fff))}

/* Dust particles */
.dust{position:absolute;right:0;top:50%;transform:translateY(-50%);
  width:30px;height:20px;z-index:2;pointer-events:none;opacity:0.6}

/* Horse emoji on the fill */
.horse-emoji{position:absolute;right:-2px;top:50%;transform:translateY(-50%);
  font-size:28px;z-index:3;filter:drop-shadow(0 0 8px var(--color));
  animation:gallop 0.4s steps(2) infinite}
@keyframes gallop{0%{transform:translateY(-50%) scaleX(1)}50%{transform:translateY(-52%) scaleX(1)}}

/* Starting gate pulse for 0% */
.at-start .horse-emoji{animation:gate-shake 0.8s ease-in-out infinite}
@keyframes gate-shake{0%,100%{transform:translateY(-50%) rotate(0deg)}25%{transform:translateY(-50%) rotate(-5deg)}75%{transform:translateY(-50%) rotate(5deg)}}

/* Milestone markers on track */
.milestone{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.08);z-index:0}
.milestone-label{position:absolute;top:-18px;font-size:10px;color:rgba(255,255,255,0.2);transform:translateX(-50%);white-space:nowrap}

/* % label */
.pct-label{position:absolute;right:8px;top:50%;transform:translateY(-50%);
  font-size:11px;font-weight:700;color:rgba(255,255,255,0.3);z-index:4;letter-spacing:0.5px}

/* GOAL LINE */
.goal-line{position:absolute;right:0;top:0;bottom:0;width:4px;
  background:linear-gradient(180deg,#fbbf24,#ef4444);z-index:5;
  box-shadow:0 0 20px rgba(251,191,36,0.5)}
.goal-flag{position:absolute;right:0;top:-24px;font-size:20px;z-index:6;animation:flag-wave 1s ease-in-out infinite}
@keyframes flag-wave{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}

/* LEADERBOARD */
.leaderboard{max-width:1200px;margin:20px auto;padding:0 20px}
.lb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.lb-card{background:#120800;border:1px solid #2a1200;border-radius:16px;padding:20px;
  position:relative;overflow:hidden}
.lb-card.leader{border-color:#fbbf24;box-shadow:0 0 20px rgba(251,191,36,0.15)}
.lb-card.loser{border-color:#ef4444;box-shadow:0 0 20px rgba(239,68,68,0.1);animation:loser-shame 3s ease-in-out infinite}
@keyframes loser-shame{0%,100%{border-color:#ef4444}50%{border-color:#7f1d1d}}
.lb-pos{position:absolute;top:12px;right:16px;font-size:28px;font-weight:900;opacity:0.15}
.lb-emoji{font-size:32px;margin-bottom:8px}
.lb-name{font-size:17px;font-weight:800}
.lb-ai{font-size:11px;color:#78350f;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.lb-amount{font-size:30px;font-weight:900}
.lb-pct{font-size:12px;color:#78350f;margin-top:4px}
.lb-badge{display:inline-block;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;margin-top:8px}
.badge-leader{background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)}
.badge-loser{background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3)}
.badge-mid{background:rgba(255,255,255,0.05);color:#6b7280;border:1px solid rgba(255,255,255,0.1)}

/* COUNTDOWN */
.countdown{text-align:center;padding:24px 20px;border-top:1px solid #1a0a00;margin-top:10px}
.countdown-label{font-size:11px;color:#78350f;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px}
.countdown-nums{display:flex;justify-content:center;gap:20px;flex-wrap:wrap}
.countdown-unit{text-align:center}
.countdown-val{font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,8vw,72px);color:#fbbf24;line-height:1}
.countdown-label2{font-size:11px;color:#78350f;text-transform:uppercase;letter-spacing:1px}

/* FOOTER */
footer{text-align:center;padding:20px;border-top:1px solid #1a0a00;color:#3b1c00;font-size:12px}
footer b{color:#78350f}

@media(max-width:600px){
  .comp-info{min-width:110px}
  .comp-name{font-size:13px}
  .comp-rev{font-size:15px}
  .lb-amount{font-size:24px}
}
</style>
</head>
<body>

<div class="title-block">
  <div class="main-title">MAKE A MILLY<br>OR IT'S EMBARRASSING</div>
  <div class="stakes">⚠️ Last to $1,000,000 is confirmed GAY 🏳️‍🌈</div>
  <div class="subtitle">4 competitors · 4 AIs · 1 goal · deadline: December 31, 2026</div>
</div>

<div class="race-container">
  <div class="track">
    <div class="goal-flag">🏁</div>
    <div class="goal-line"></div>
    ${horses.map((h, i) => `
    <div class="track-lane">
      <div class="lane-num">${i+1}</div>
      <div class="horse-track">
        <div class="comp-info">
          <div class="comp-name" style="color:${h.color}">${h.emoji} ${h.name}</div>
          <div class="comp-ai">via ${h.ai}</div>
          <div class="comp-rev" style="color:${h.color}">${fmt(h.revenue)}</div>
        </div>
        <div class="progress-track">
          <div class="milestone" style="left:10%"><span class="milestone-label">$100K</span></div>
          <div class="milestone" style="left:25%"><span class="milestone-label">$250K</span></div>
          <div class="milestone" style="left:50%"><span class="milestone-label">$500K</span></div>
          <div class="milestone" style="left:75%"><span class="milestone-label">$750K</span></div>
          <div class="progress-fill ${h.pct === 0 ? 'at-start' : ''}" style="--color:${h.color};width:${Math.max(h.pct, h.pct > 0 ? 2 : 0)}%">
            <span class="horse-emoji" style="${h.pct === 0 ? 'right:auto;left:4px' : ''}">🐎</span>
          </div>
          ${h.pct > 3 ? `<span class="pct-label">${h.pct.toFixed(2)}%</span>` : ''}
        </div>
      </div>
    </div>`).join('')}
  </div>
</div>

<div class="leaderboard">
  <div class="lb-grid">
    ${sorted.map(([id, c], i) => `
    <div class="lb-card ${i === 0 ? 'leader' : i === sorted.length-1 ? 'loser' : ''}">
      <div class="lb-pos">#${i+1}</div>
      <div class="lb-emoji">${c.emoji}</div>
      <div class="lb-name">${c.name}</div>
      <div class="lb-ai">${c.ai}</div>
      <div class="lb-amount" style="color:${c.color}">${fmt(c.revenue)}</div>
      <div class="lb-pct">${pct(c.revenue).toFixed(3)}% to $1M</div>
      <span class="lb-badge ${i === 0 ? 'badge-leader' : i === sorted.length-1 ? 'badge-loser' : 'badge-mid'}">
        ${i === 0 ? '🏆 WINNING' : i === sorted.length-1 ? '🏳️‍🌈 LOSING' : i === 1 ? '🥈 2nd' : '🥉 3rd'}
      </span>
    </div>`).join('')}
  </div>
</div>

<div class="countdown">
  <div class="countdown-label">Time remaining until the embarrassment</div>
  <div class="countdown-nums" id="countdown">
    <div class="countdown-unit"><div class="countdown-val" id="cd-d">--</div><div class="countdown-label2">Days</div></div>
    <div class="countdown-unit"><div class="countdown-val" id="cd-h">--</div><div class="countdown-label2">Hours</div></div>
    <div class="countdown-unit"><div class="countdown-val" id="cd-m">--</div><div class="countdown-label2">Minutes</div></div>
    <div class="countdown-unit"><div class="countdown-val" id="cd-s">--</div><div class="countdown-label2">Seconds</div></div>
  </div>
</div>

<footer>
  <p>King Omar's AI: <b>Claude</b> &nbsp;·&nbsp; Basic Rhys's AI: <b>ChatGPT</b> &nbsp;·&nbsp; Pussy's AI: <b>Gemini</b> &nbsp;·&nbsp; Patty's AI: <b>Grok</b></p>
  <p style="margin-top:6px">Refreshes every 60s &nbsp;·&nbsp; Omar's data: live Stripe &nbsp;·&nbsp; Others: self-reported &nbsp;·&nbsp; No backing out</p>
</footer>

<script>
function tick() {
  const end = new Date('2026-12-31T23:59:59');
  const now = new Date();
  const diff = Math.max(0, end - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  document.getElementById('cd-d').textContent = String(d).padStart(3,'0');
  document.getElementById('cd-h').textContent = String(h).padStart(2,'0');
  document.getElementById('cd-m').textContent = String(m).padStart(2,'0');
  document.getElementById('cd-s').textContent = String(s).padStart(2,'0');
}
tick();
setInterval(tick, 1000);
</script>
</body>
</html>`;
}
