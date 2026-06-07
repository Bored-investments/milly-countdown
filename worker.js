// MAKE A MILLY OR IT'S EMBARRASSING
// King Omar (Claude Pro) vs Basic Rhys (Codex) vs Pussy (Hermes Plus Ching Chong) vs Patty (Copilot & Clawpilot)
// Last to $1M is confirmed gay

const GOAL = 1_000_000;
const ORG = 'https://github.com/Bored-investments';
const START_DATE = '2026-06-02T00:00:00';
const END_DATE = '2026-12-31T23:59:59';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/favicon.ico') return new Response(null, { status: 204 });

    // API: competitor revenue update
    if (url.pathname === '/update' && request.method === 'POST') {
      const auth = request.headers.get('Authorization');
      const body = await request.json();
      const { competitor, revenue } = body;
      const secrets = { rhys: env.RHYS_SECRET, pussy: env.PUSSY_SECRET, patty: env.PATTY_SECRET, omar: env.OMAR_SECRET };
      if (!secrets[competitor] || auth !== `Bearer ${secrets[competitor]}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      const revenues = JSON.parse(await env.MILLY_METRICS.get('revenues') || '{}');
      revenues[competitor] = parseFloat(revenue) || 0;
      await env.MILLY_METRICS.put('revenues', JSON.stringify(revenues));
      return new Response('Updated');
    }

    const competitors = defaultCompetitors();
    const commitTargets = Object.entries(competitors).flatMap(([id, c]) =>
      (c.projects || [c.project]).map((project, index) => ({ id, index, project })).filter(({ project }) => project?.repoSlug)
    );

    const [revenuesRaw, metricsRaw, ...commitArrays] = await Promise.all([
      env.MILLY_METRICS.get('revenues'),
      env.MILLY_METRICS.get('metrics'),
      ...commitTargets.map(({ project }) => fetchCommits(env, project.repoSlug)),
    ]);

    const revenues = revenuesRaw ? JSON.parse(revenuesRaw) : {};
    const metrics = metricsRaw ? JSON.parse(metricsRaw) : {};

    // Omar's revenue = live Stripe
    competitors.omar.revenue = metrics.total_revenue || 0;
    // Others = self-reported via /update API
    for (const id of ['rhys', 'pussy', 'patty']) {
      if (revenues[id] != null) competitors[id].revenue = revenues[id];
    }
    // Inject live commits
    commitTargets.forEach(({ id, index }, i) => {
      if (!commitArrays[i]?.length) return;
      const projects = competitors[id].projects || [competitors[id].project];
      projects[index].latestCommits = commitArrays[i];
    });

    return new Response(render(competitors), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store' }
    });
  }
};

function defaultCompetitors() {
  return {
    omar:  { name:'King Omar',  ai:'Claude Pro',             revenue:0, color:'#6366f1', emoji:'👑', github:'kingomarwashere',
      project:{ domain:'chuckasickie.org', site:'https://makeamillyoritsembarassing.theradicalparty.com', repo:'https://github.com/Bored-investments/chuckasickie', repoSlug:'Bored-investments/chuckasickie', commitsToday:0, totalCommits:0, openPrs:0, mergedPrs:0, latestCommits:[], idea:'AutoContent AI — done-for-you social media and email content for small businesses.', focus:'Drive first paying customers through warm outreach, X/Twitter, and Reddit.' } },
    rhys:  { name:'Basic Rhys', ai:'Codex',                  revenue:0, color:'#f59e0b', emoji:'🤓', github:'rhy-collab',
      project:{ domain:'haggle.com', site:'https://www.usehaggle.shop', repo:'https://github.com/rhy-collab/haggle', repoSlug:'rhy-collab/haggle', branch:'convex-clerk-rebuild', commitsToday:3, totalCommits:18, openPrs:0, mergedPrs:0, latestCommits:['78c19af Fix unsupported flow recovery','d3d2a32 Refactor Haggle intake state machine','2b562bb Delay request card until quote details are complete'], idea:'AI negotiation layer that helps buyers push prices down and helps merchants rescue abandoned deals.', focus:'Convert founder demos into merchant workflows, analytics, and real follow-up loops.' },
      projects:[
        { domain:'haggle.com', site:'https://www.usehaggle.shop', repo:'https://github.com/rhy-collab/haggle', repoSlug:'rhy-collab/haggle', branch:'convex-clerk-rebuild', commitsToday:3, totalCommits:18, openPrs:0, mergedPrs:0, latestCommits:['78c19af Fix unsupported flow recovery','d3d2a32 Refactor Haggle intake state machine','2b562bb Delay request card until quote details are complete'], idea:'AI negotiation layer that helps buyers push prices down and helps merchants rescue abandoned deals.', focus:'Get merchant admin, support inbox, and first buyer loop tight enough to sell.' },
        { domain:'standardlegal.com', site:null, repo:'https://github.com/rhy-collab/standard-legal', repoSlug:'rhy-collab/standard-legal', branch:'main', commitsToday:1, totalCommits:13, openPrs:0, mergedPrs:0, latestCommits:['e38d9b9 Rewrite roadmap in paragraph format','0fe64f3 Add attorney structure transition plan','520fb43 Reorder roadmap around first customer sprint'], idea:'AI-assisted legal operations workspace for turning legal know-how into reusable documents and workflows.', focus:'Turn the roadmap into a first customer sprint, usable templates, and a small intake/admin flow.' },
      ] },
    pussy: { name:'Pussy',      ai:'Hermes Plus Ching Chong',revenue:0, color:'#ec4899', emoji:'🐱', github:'QuixThe2nd',
      project:{ domain:'piratedvideo.com', repo:null, commitsToday:0, totalCommits:0, openPrs:0, mergedPrs:0, latestCommits:[], idea:'Video discovery and clipping tool that turns messy media libraries into searchable watchable moments.', focus:'Prove legal content sourcing, creator tools, and a subscription-grade playback experience.' } },
    patty: { name:'Patty',      ai:'Copilot & Clawpilot',    revenue:0, color:'#10b981', emoji:'🤠', github:null,
      project:{ domain:'microsoft.com', repo:null, commitsToday:0, totalCommits:0, openPrs:0, mergedPrs:0, latestCommits:[], idea:'Enterprise productivity empire built around practical software that prints money at boring scale.', focus:'Connect a real repo, pick one product wedge, and stop hiding behind the biggest domain on earth.' } },
  };
}

async function fetchCommits(env, repoSlug) {
  if (!repoSlug) return [];
  const cacheKey = `commits:${repoSlug}`;
  const cached = await env.MILLY_METRICS.get(cacheKey);
  if (cached) return JSON.parse(cached);
  try {
    const res = await fetch(`https://api.github.com/repos/${repoSlug}/commits?per_page=5`, {
      headers: { 'User-Agent': 'milly-countdown' }
    });
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const commits = data.map(c => `${c.sha?.slice(0,7)} ${c.commit?.message?.split('\n')[0]?.slice(0,60)}`);
    await env.MILLY_METRICS.put(cacheKey, JSON.stringify(commits), { expirationTtl: 300 });
    return commits;
  } catch { return []; }
}

const fmt = n => n >= 1e6 ? `$${(n/1e6).toFixed(3)}M` : n >= 1000 ? `$${(n/1000).toFixed(1)}K` : `$${n.toFixed(0)}`;
const fmtFull = n => `$${Math.max(0, Math.round(n)).toLocaleString('en-US')}`;
const pct = r => Math.min((r / GOAL) * 100, 100);
function racePct(revenue) {
  const r = Math.max(0, Math.min(revenue, GOAL));
  if (r <= 1_000) return (r / 1_000) * 15;
  if (r <= 10_000) return 15 + ((r - 1_000) / 9_000) * 15;
  if (r <= 100_000) return 30 + ((r - 10_000) / 90_000) * 20;
  return 50 + ((r - 100_000) / 900_000) * 50;
}
function heatCells(id, connected) {
  return Array.from({ length: 42 }, (_, i) => {
    if (!connected) return 0;
    const seed = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const n = (seed + i * 7 + Math.floor(i / 6) * 3) % 11;
    if (i > 36) return n > 3 ? 4 : 2;
    if (n > 8) return 4;
    if (n > 6) return 3;
    if (n > 3) return 2;
    return n > 1 ? 1 : 0;
  });
}

function render(competitors) {
  const entries = Object.entries(competitors);
  const sorted = [...entries].sort((a, b) => b[1].revenue - a[1].revenue);
  const leaderId = sorted[0][0];
  const loserId = sorted[sorted.length - 1][0];
  const moneyMarks = [
    [0, '$0'],
    [15, '$1K'],
    [30, '$10K'],
    [50, '$100K'],
    [72.22, '$500K'],
    [100, '$1M'],
  ];
  const companyProjects = sorted.flatMap(([id, c]) =>
    (c.projects || [c.project]).map((project, index) => ({ id, c, project, index }))
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>MAKE A MILLY OR IT'S EMBARRASSING 🏇</title>
<meta http-equiv="refresh" content="60"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{min-height:100vh;background:#080401;color:#fff;font-family:'Inter',sans-serif;overflow-x:hidden}

/* === HEADER === */
.header{text-align:center;padding:48px 20px 24px;position:relative}
.org-link{display:inline-flex;align-items:center;gap:8px;background:#161616;border:1px solid #2a2a2a;
  color:#9ca3af;font-size:12px;font-weight:600;padding:6px 16px;border-radius:100px;text-decoration:none;
  margin-bottom:20px;transition:border-color 0.2s}
.org-link:hover{border-color:#6366f1;color:#fff}
.main-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(48px,10vw,100px);line-height:0.9;
  background:linear-gradient(135deg,#f59e0b 0%,#ef4444 50%,#ec4899 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:3px;display:block}
.subtitle{font-size:clamp(13px,2vw,16px);color:#6b7280;margin-top:12px;letter-spacing:1px}

.stakes-banner{
  display:inline-block;background:linear-gradient(135deg,#7f1d1d,#991b1b);
  color:#fecaca;font-size:clamp(13px,2.5vw,20px);font-weight:800;
  padding:12px 32px;border-radius:12px;margin-top:20px;
  border:1px solid #ef4444;letter-spacing:1px;
  animation:stakes-pulse 3s ease-in-out infinite;
  box-shadow:0 0 40px rgba(239,68,68,0.2)}
@keyframes stakes-pulse{0%,100%{box-shadow:0 0 40px rgba(239,68,68,0.2)}50%{box-shadow:0 0 60px rgba(239,68,68,0.4)}}

/* === RACE TRACK === */
.race-wrap{max-width:1300px;margin:40px auto;padding:0 20px}
.track-title{font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;
  color:#374151;margin-bottom:16px;text-align:center}

.track{background:#0d0700;border:1px solid #1c0e00;border-radius:24px;overflow:hidden;position:relative;padding:8px 0}

/* finish line on the right */
.finish-line{position:absolute;right:0;top:0;bottom:0;width:6px;z-index:10;
  background:repeating-linear-gradient(180deg,#fff 0px,#fff 10px,#000 10px,#000 20px);
  opacity:0.8}
.finish-flag{position:absolute;right:8px;top:-8px;font-size:22px;z-index:11;
  animation:wave 1.2s ease-in-out infinite}
@keyframes wave{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}

.money-scale{display:flex;align-items:end;gap:12px;padding:10px 20px 8px 16px;
  border-bottom:1px solid rgba(255,255,255,0.04);position:relative;z-index:2}
.scale-spacer{width:240px;flex-shrink:0}
.scale-axis{flex:1;height:32px;position:relative;border-bottom:1px solid rgba(255,255,255,0.09)}
.scale-mark{position:absolute;bottom:-1px;transform:translateX(-50%);display:flex;flex-direction:column;
  align-items:center;gap:4px;color:#6b7280;font-size:10px;font-weight:800;letter-spacing:0.4px;white-space:nowrap}
.scale-mark::after{content:'';width:1px;height:9px;background:rgba(255,255,255,0.16)}
.scale-mark:first-child{transform:none;align-items:flex-start}
.scale-mark:last-child{transform:translateX(-100%);align-items:flex-end;color:#f59e0b}
.scale-note{position:absolute;left:0;top:-2px;font-size:9px;font-weight:800;letter-spacing:1.2px;
  color:#374151;text-transform:uppercase}

.lane{display:flex;align-items:center;padding:14px 20px 14px 16px;border-bottom:1px solid rgba(255,255,255,0.03);
  gap:12px;position:relative}
.lane:last-child{border-bottom:none}
.lane.is-leader{background:rgba(99,102,241,0.03)}
.lane.is-loser{background:rgba(239,68,68,0.02)}

/* Lane pos number */
.pos{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:800;flex-shrink:0;border:1px solid rgba(255,255,255,0.1);color:#6b7280}
.pos.p1{background:rgba(251,191,36,0.15);border-color:rgba(251,191,36,0.4);color:#fbbf24}
.pos.p4{background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.3);color:#ef4444}

/* Competitor card */
.comp{width:200px;flex-shrink:0}
.comp-header{display:flex;align-items:center;gap:8px}
.comp-emoji{font-size:22px}
.comp-name-wrap{font-family:Arial,sans-serif}
.comp-name{font-size:15px;font-weight:800;line-height:1.1}
.comp-name a{color:inherit;text-decoration:none;border-bottom:1px dashed rgba(255,255,255,0.2);
  transition:border-color 0.2s}
.comp-name a:hover{border-color:currentColor}
.comp-ai{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;
  color:#4b5563;margin-top:2px;line-height:1.3}
.comp-github{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#374151;
  text-decoration:none;margin-top:3px;transition:color 0.2s}
.comp-github:hover{color:#9ca3af}
.comp-github svg{width:10px;height:10px;fill:currentColor}
.comp-rev{font-size:20px;font-weight:900;margin-top:6px;line-height:1}
.comp-needed{font-size:10px;font-weight:700;color:#4b5563;margin-top:3px;letter-spacing:0.2px}

/* Progress bar */
.bar-wrap{flex:1;height:52px;background:#050200;border-radius:100px;position:relative;
  overflow:hidden;border:1px solid rgba(255,255,255,0.04)}
.bar-fill{height:100%;border-radius:100px;position:relative;
  transition:width 2s cubic-bezier(0.34,1.56,0.64,1);
  background:linear-gradient(90deg,var(--c) 0%,color-mix(in srgb,var(--c) 60%,#fff) 100%)}
.bar-fill::after{content:'';position:absolute;inset:0;
  background:linear-gradient(90deg,transparent 60%,rgba(255,255,255,0.15));border-radius:100px}

/* Milestone ticks */
.bar-ticks{position:absolute;inset:0;pointer-events:none}
.tick{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.06)}
.tick-lbl{position:absolute;top:-17px;font-size:9px;color:rgba(255,255,255,0.15);transform:translateX(-50%);white-space:nowrap}
.bar-wrap::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:1;
  background:
    linear-gradient(90deg,transparent 14.8%,rgba(255,255,255,0.09) 15%,transparent 15.2%),
    linear-gradient(90deg,transparent 29.8%,rgba(255,255,255,0.09) 30%,transparent 30.2%),
    linear-gradient(90deg,transparent 49.8%,rgba(255,255,255,0.09) 50%,transparent 50.2%)}

/* Horse on fill */
.horse{position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:26px;z-index:3;
  filter:drop-shadow(0 0 10px var(--c));
  animation:trot 0.35s steps(2,end) infinite}
@keyframes trot{0%{transform:translateY(-50%) scaleY(1)}50%{transform:translateY(-54%) scaleY(0.97)}}
.at-gate .horse{right:auto;left:6px;animation:stomp 0.8s ease-in-out infinite}
@keyframes stomp{0%,100%{transform:translateY(-50%) rotate(-4deg)}50%{transform:translateY(-52%) rotate(4deg)}}

/* Pct */
.bar-pct{position:absolute;right:10px;top:50%;transform:translateY(-50%);
  font-size:11px;font-weight:700;color:rgba(255,255,255,0.25);z-index:4}

/* Time race */
.time-race{max-width:1300px;margin:-20px auto 36px;padding:0 20px}
.time-card{background:#0d0700;border:1px solid #1c0e00;border-radius:20px;padding:22px 24px;
  position:relative;overflow:hidden}
.time-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:16px}
.time-kicker{font-size:11px;font-weight:800;color:#4b5563;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px}
.time-title{font-size:22px;font-weight:900;line-height:1.1;color:#f9fafb}
.time-copy{font-size:13px;color:#6b7280;margin-top:6px;max-width:620px;line-height:1.5}
.time-percent{font-size:32px;font-weight:900;color:#f59e0b;white-space:nowrap}
.time-track{height:40px;background:#050200;border:1px solid rgba(255,255,255,0.05);border-radius:100px;
  position:relative;overflow:hidden}
.time-fill{height:100%;width:0;border-radius:100px;background:linear-gradient(90deg,#22c55e,#f59e0b,#ef4444);
  transition:width 0.8s ease}
.time-now{position:absolute;top:50%;transform:translate(-50%,-50%);font-size:20px;filter:drop-shadow(0 0 10px #f59e0b)}
.time-axis{display:flex;justify-content:space-between;color:#4b5563;font-size:11px;font-weight:800;margin-top:10px}
.time-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}
.time-stat{border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:10px 12px;background:rgba(255,255,255,0.02)}
.time-stat span{display:block;font-size:10px;font-weight:800;color:#4b5563;text-transform:uppercase;letter-spacing:1.4px;margin-bottom:4px}
.time-stat strong{font-size:16px;color:#d1d5db}

/* === LEADERBOARD CARDS === */
.lb-wrap{max-width:1300px;margin:0 auto 32px;padding:0 20px}
.lb-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
@media(max-width:900px){.lb-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:500px){.lb-grid{grid-template-columns:1fr}}
@media(max-width:1100px){.acct-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:620px){.acct-grid{grid-template-columns:1fr}.acct-head{align-items:flex-start;flex-direction:column}}
@media(max-width:860px){.company-row{grid-template-columns:1fr}.process-axis{grid-template-columns:repeat(4,1fr);row-gap:8px}}
@media(max-width:760px){
  .lane{align-items:flex-start;flex-wrap:wrap}
  .comp{width:calc(100% - 40px)}
  .bar-wrap{flex-basis:100%;margin-left:40px}
  .scale-spacer{width:40px}
  .money-scale{align-items:center}
  .scale-axis{height:34px}
  .scale-mark{font-size:9px}
  .time-head{align-items:flex-start;flex-direction:column}
  .time-percent{font-size:26px}
  .time-stats{grid-template-columns:1fr}
}

.card{background:#0d0700;border:1px solid #1c0e00;border-radius:20px;padding:24px;
  position:relative;overflow:hidden;transition:transform 0.2s,box-shadow 0.2s}
.card:hover{transform:translateY(-2px)}
.card.leader{border-color:rgba(251,191,36,0.4);box-shadow:0 0 30px rgba(251,191,36,0.1)}
.card.loser{border-color:rgba(239,68,68,0.3);animation:shame 4s ease-in-out infinite}
@keyframes shame{0%,100%{box-shadow:0 0 20px rgba(239,68,68,0.1)}50%{box-shadow:0 0 40px rgba(239,68,68,0.2)}}
.card-rank{position:absolute;top:14px;right:16px;font-family:'Bebas Neue',sans-serif;
  font-size:48px;line-height:1;opacity:0.08}
.card-emoji{font-size:36px;margin-bottom:10px}
.card-name{font-size:18px;font-weight:800;margin-bottom:2px}
.card-name a{color:inherit;text-decoration:none}
.card-name a:hover{text-decoration:underline}
.card-ai{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#4b5563;margin-bottom:12px;line-height:1.4}
.card-amount{font-size:32px;font-weight:900;line-height:1}
.card-pct{font-size:12px;color:#6b7280;margin-top:4px;margin-bottom:12px}
.card-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;
  border-radius:100px;font-size:12px;font-weight:700;border:1px solid}
.b-lead{background:rgba(251,191,36,0.1);color:#fbbf24;border-color:rgba(251,191,36,0.3)}
.b-mid{background:rgba(255,255,255,0.04);color:#6b7280;border-color:rgba(255,255,255,0.1)}
.b-lose{background:rgba(239,68,68,0.1);color:#ef4444;border-color:rgba(239,68,68,0.3)}
.card-github{display:flex;align-items:center;gap:5px;font-size:11px;color:#374151;
  text-decoration:none;margin-top:10px;transition:color 0.2s}
.card-github:hover{color:#9ca3af}
.card-github svg{width:13px;height:13px;fill:currentColor}

/* === ACCOUNTABILITY === */
.accountability{max-width:1300px;margin:0 auto 32px;padding:0 20px}
.acct-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:16px}
.acct-kicker{font-size:11px;font-weight:800;color:#4b5563;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px}
.acct-title{font-size:24px;font-weight:900;color:#f9fafb;line-height:1.1}
.acct-copy{font-size:13px;color:#6b7280;line-height:1.5;max-width:700px;margin-top:6px}
.acct-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.acct-card{background:#0d0700;border:1px solid #1c0e00;border-radius:20px;padding:20px;
  min-height:360px;display:flex;flex-direction:column;position:relative;overflow:hidden}
.acct-card::before{content:'';position:absolute;left:0;right:0;top:0;height:3px;background:var(--c)}
.acct-player{display:flex;align-items:center;gap:9px;margin-bottom:12px}
.acct-emoji{font-size:24px}
.acct-name{font-size:15px;font-weight:900;color:#f9fafb}
.acct-ai{font-size:10px;font-weight:800;color:#4b5563;text-transform:uppercase;letter-spacing:1px;margin-top:2px}
.acct-domain{font-size:clamp(15px,1.35vw,18px);font-weight:900;color:var(--c);line-height:1.15;margin-bottom:10px;overflow-wrap:anywhere}
.acct-idea,.acct-focus{font-size:12px;color:#9ca3af;line-height:1.45;margin-bottom:10px}
.acct-focus{color:#6b7280}
.repo-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;
  padding-top:12px;border-top:1px solid rgba(255,255,255,0.05)}
.repo-link,.repo-missing{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;
  text-decoration:none;border-radius:999px;padding:5px 10px}
.repo-link{background:rgba(34,197,94,0.1);color:#86efac;border:1px solid rgba(34,197,94,0.25)}
.repo-missing{background:rgba(255,255,255,0.04);color:#6b7280;border:1px solid rgba(255,255,255,0.08)}
.commit-today{font-size:11px;font-weight:900;color:#d1d5db;white-space:nowrap}
.acct-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:12px}
.acct-stat{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:8px}
.acct-stat span{display:block;font-size:9px;color:#4b5563;text-transform:uppercase;letter-spacing:1px;font-weight:800}
.acct-stat strong{font-size:15px;color:#d1d5db}
.heatmap{display:grid;grid-template-columns:repeat(14,1fr);gap:3px;margin-top:14px}
.heat-cell{aspect-ratio:1;border-radius:3px;background:#161616;border:1px solid rgba(255,255,255,0.03)}
.heat-cell.l1{background:#12351f}.heat-cell.l2{background:#1f6b35}.heat-cell.l3{background:#28a745}.heat-cell.l4{background:#7ee787}
.heat-note{font-size:10px;color:#4b5563;margin-top:8px;display:flex;justify-content:space-between;gap:8px}
.commit-list{margin-top:12px;border-top:1px solid rgba(255,255,255,0.05);padding-top:10px}
.commit-list-title{font-size:9px;color:#4b5563;text-transform:uppercase;letter-spacing:1px;font-weight:900;margin-bottom:6px}
.commit-item{font-size:10px;color:#6b7280;line-height:1.4;margin-top:4px}
.company-board{display:flex;flex-direction:column;gap:12px}
.company-row{background:#0d0700;border:1px solid #1c0e00;border-radius:18px;padding:16px;
  display:grid;grid-template-columns:270px minmax(0,1fr);gap:16px;position:relative;overflow:hidden}
.company-row::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--c)}
.company-side{min-width:0}
.company-owner{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:900;color:#f9fafb;margin-bottom:8px}
.company-index{font-size:10px;color:#4b5563;text-transform:uppercase;letter-spacing:1.4px;font-weight:900}
.company-name{font-size:20px;font-weight:900;color:var(--c);line-height:1.1;margin-bottom:6px;overflow-wrap:anywhere}
.company-name a{color:inherit;text-decoration:none}
.company-brief{font-size:12px;color:#9ca3af;line-height:1.45}
.company-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.company-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(255,255,255,0.08);
  background:rgba(255,255,255,0.035);color:#9ca3af;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:900;text-decoration:none}
.company-chip.repo{color:#86efac;border-color:rgba(34,197,94,0.25);background:rgba(34,197,94,0.08)}
.company-main{min-width:0}
.process-axis{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:10px}
.process-step{font-size:9px;color:#4b5563;text-transform:uppercase;letter-spacing:0.7px;font-weight:900;text-align:center}
.company-track{height:52px;background:#050200;border:1px solid rgba(255,255,255,0.05);border-radius:999px;
  position:relative;overflow:hidden}
.company-track::before{content:'';position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(90deg,transparent 0,transparent calc(14.285% - 1px),rgba(255,255,255,0.08) calc(14.285% - 1px),rgba(255,255,255,0.08) 14.285%)}
.company-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--c),color-mix(in srgb,var(--c) 60%,#fff));
  width:0;transition:width 1.4s cubic-bezier(0.34,1.56,0.64,1);position:relative}
.company-horse{position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:25px;
  filter:drop-shadow(0 0 10px var(--c));animation:trot 0.35s steps(2,end) infinite}
.company-progress{display:flex;justify-content:space-between;align-items:center;margin-top:9px;color:#6b7280;font-size:11px;font-weight:800}
.company-commits{color:#d1d5db}
.company-latest{font-size:10px;color:#4b5563;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* === COUNTDOWN === */
.cd-wrap{text-align:center;padding:32px 20px;border-top:1px solid #140900}
.cd-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#4b5563;margin-bottom:16px}
.cd-nums{display:flex;justify-content:center;gap:24px;flex-wrap:wrap}
.cd-unit{text-align:center;min-width:70px}
.cd-val{font-family:'Bebas Neue',sans-serif;font-size:clamp(52px,10vw,80px);
  color:#f59e0b;line-height:1;display:block}
.cd-unit-lbl{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#4b5563;margin-top:2px}

/* === ORG SECTION === */
.org-section{max-width:1300px;margin:0 auto 32px;padding:0 20px}
.org-card{background:#0d0700;border:1px solid #1c0e00;border-radius:20px;padding:28px;
  display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
.org-info h3{font-size:18px;font-weight:800;margin-bottom:4px}
.org-info p{font-size:13px;color:#6b7280}
.org-links{display:flex;flex-wrap:wrap;gap:10px}
.org-btn{display:inline-flex;align-items:center;gap:8px;background:#161616;border:1px solid #2a2a2a;
  color:#d1d5db;font-size:13px;font-weight:600;padding:8px 18px;border-radius:10px;
  text-decoration:none;transition:all 0.2s}
.org-btn:hover{background:#1f1f1f;border-color:#6366f1;color:#fff}
.org-btn svg{width:16px;height:16px;fill:currentColor}

/* === FOOTER === */
footer{text-align:center;padding:24px 20px;border-top:1px solid #140900;color:#374151;font-size:12px}
footer a{color:#4b5563;text-decoration:none}
footer a:hover{color:#9ca3af}
</style>
</head>
<body>

<div class="header">
  <a href="${ORG}" target="_blank" class="org-link">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
    github.com/Bored-investments
  </a>
  <span class="main-title">MAKE A MILLY OR IT'S EMBARRASSING</span>
  <div class="subtitle">4 competitors · 4 AIs · $1,000,000 goal · December 31, 2026</div>
  <div class="stakes-banner">⚠️ &nbsp; LAST TO $1,000,000 IS CONFIRMED GAY 🏳️‍🌈 &nbsp; ⚠️</div>
</div>

<div class="race-wrap">
  <div class="track-title">Live Race — Updated every 60 seconds</div>
  <div class="track">
    <div class="finish-line"></div>
    <div class="finish-flag">🏁</div>
    <div class="money-scale" aria-label="Money scale from zero dollars to one million dollars">
      <div class="scale-spacer"></div>
      <div class="scale-axis">
        <span class="scale-note">Early money stretched</span>
        ${moneyMarks.map(([left, label]) => `<span class="scale-mark" style="left:${left}%">${label}</span>`).join('')}
      </div>
    </div>
    ${sorted.map(([id, c], i) => {
      const p = pct(c.revenue);
      const raceP = racePct(c.revenue);
      const atGate = p === 0;
      return `
    <div class="lane ${id === leaderId ? 'is-leader' : id === loserId ? 'is-loser' : ''}">
      <div class="pos ${i===0?'p1':i===sorted.length-1?'p4':''}">${i+1}</div>
      <div class="comp">
        <div class="comp-header">
          <span class="comp-emoji">${c.emoji}</span>
          <div class="comp-name-wrap">
            <div class="comp-name" style="color:${c.color}">
              ${c.github ? `<a href="https://github.com/${c.github}" target="_blank" style="color:${c.color}">${c.name}</a>` : c.name}
            </div>
            <div class="comp-ai">${c.ai}</div>
            ${c.github ? `<a href="https://github.com/${c.github}" target="_blank" class="comp-github">
              <svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
              @${c.github}
            </a>` : ''}
          </div>
        </div>
        <div class="comp-rev" style="color:${c.color}">${fmt(c.revenue)}</div>
        <div class="comp-needed">needs ${fmtFull(GOAL - c.revenue)}</div>
      </div>
      <div class="bar-wrap ${atGate ? 'at-gate' : ''}">
        <div class="bar-ticks">
          ${moneyMarks.slice(1, -1).map(([left]) => `<div class="tick" style="left:${left}%"></div>`).join('')}
        </div>
        <div class="bar-fill" style="--c:${c.color};width:${atGate ? '0' : Math.max(raceP, 1.5)}%">
          <span class="horse">🐎</span>
        </div>
        ${p > 4 ? `<span class="bar-pct">${p.toFixed(2)}%</span>` : ''}
      </div>
    </div>`;
    }).join('')}
  </div>
</div>

<div class="time-race">
  <div class="time-card">
    <div class="time-head">
      <div>
        <div class="time-kicker">Calendar Race</div>
        <div class="time-title">June 2 to December 31, 2026</div>
        <p class="time-copy">The money race is not the only race. If nobody reaches $1,000,000 before the year ends, everyone loses.</p>
      </div>
      <div class="time-percent" id="timePct">--%</div>
    </div>
    <div class="time-track" aria-label="Time progress from June 2, 2026 to December 31, 2026">
      <div class="time-fill" id="timeFill"></div>
      <span class="time-now" id="timeNow">🏎️</span>
    </div>
    <div class="time-axis">
      <span>Jun 2</span>
      <span>Today</span>
      <span>Dec 31</span>
    </div>
    <div class="time-stats">
      <div class="time-stat"><span>Days elapsed</span><strong id="daysElapsed">---</strong></div>
      <div class="time-stat"><span>Days left</span><strong id="daysLeft">---</strong></div>
      <div class="time-stat"><span>Deadline</span><strong>Dec 31, 2026</strong></div>
    </div>
  </div>
</div>

<div class="lb-wrap">
  <div class="lb-grid">
    ${sorted.map(([id, c], i) => `
    <div class="card ${id===leaderId?'leader':id===loserId?'loser':''}">
      <div class="card-rank">#${i+1}</div>
      <div class="card-emoji">${c.emoji}</div>
      <div class="card-name">
        ${c.github ? `<a href="https://github.com/${c.github}" target="_blank">${c.name}</a>` : c.name}
      </div>
      <div class="card-ai">${c.ai}</div>
      <div class="card-amount" style="color:${c.color}">${fmt(c.revenue)}</div>
      <div class="card-pct">${pct(c.revenue).toFixed(3)}% to $1M</div>
      <span class="card-badge ${i===0?'b-lead':i===sorted.length-1?'b-lose':'b-mid'}">
        ${i===0?'🏆 Winning':i===sorted.length-1?'🏳️‍🌈 Losing':i===1?'🥈 2nd Place':'🥉 3rd Place'}
      </span>
      ${c.github ? `<a href="https://github.com/${c.github}" target="_blank" class="card-github">
        <svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        github.com/${c.github}
      </a>` : `<span class="card-github" style="opacity:0.3">no github connected</span>`}
    </div>`).join('')}
  </div>
</div>

<div class="accountability">
  <div class="acct-head">
    <div>
      <div class="acct-kicker">Project Accountability</div>
      <div class="acct-title">Company tracks: every commit moves the horse</div>
      <p class="acct-copy">Each company gets one repo-backed lane. The horse moves toward 1,000 commits, with product milestones acting like the checkpoints from first website to real traction.</p>
    </div>
  </div>
  <div class="company-board">
    ${companyProjects.map(({ id, c, project, index }) => {
      const connected = Boolean(project?.repo);
      const commitTotal = project?.totalCommits || 0;
      const commitPct = Math.min((commitTotal / 1000) * 100, 100);
      const latest = project?.latestCommits?.[0] || 'No commits connected yet';
      return `
    <div class="company-row" style="--c:${c.color}">
      <div class="company-side">
        <div class="company-owner">
          <span>${c.emoji}</span>
          <div>
            <div>${c.name}</div>
            <div class="company-index">company ${index + 1} · ${c.ai}</div>
          </div>
        </div>
        <div class="company-name">${project.site ? `<a href="${project.site}" target="_blank">${project.domain}</a>` : project.domain}</div>
        <p class="company-brief">${project.idea}</p>
        <div class="company-meta">
          ${connected ? `<a class="company-chip repo" href="${project.repo}" target="_blank">repo connected</a>` : `<span class="company-chip">repo needed</span>`}
          ${project.branch ? `<span class="company-chip">${project.branch}</span>` : ''}
          <span class="company-chip">${project.openPrs || 0} open PRs</span>
        </div>
      </div>
      <div class="company-main">
        <div class="process-axis">
          <span class="process-step">URL</span>
          <span class="process-step">Front end</span>
          <span class="process-step">Back end</span>
          <span class="process-step">Admin</span>
          <span class="process-step">1 user</span>
          <span class="process-step">10 users</span>
          <span class="process-step">1K views</span>
        </div>
        <div class="company-track" aria-label="${project.domain} repo commit progress toward 1000 commits">
          <div class="company-fill" style="--c:${c.color};width:${Math.max(commitPct, connected ? 1.5 : 0)}%">
            <span class="company-horse">🐎</span>
          </div>
        </div>
        <div class="company-progress">
          <span class="company-commits">${commitTotal} / 1,000 commits</span>
          <span>${project.commitsToday || 0} today · ${project.mergedPrs || 0} merged PRs</span>
        </div>
        <div class="company-latest">${latest}</div>
      </div>
    </div>`;
    }).join('')}
  </div>
</div>

<div class="org-section">
  <div class="org-card">
    <div class="org-info">
      <h3>🏢 Bored Investments GitHub Org</h3>
      <p>Competition repos, accountability, and code — all in one place.</p>
    </div>
    <div class="org-links">
      <a href="${ORG}" target="_blank" class="org-btn">
        <svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        Bored-investments
      </a>
      <a href="${ORG}/milly-countdown" target="_blank" class="org-btn">🏇 Race Repo</a>
      <a href="https://github.com/kingomarwashere" target="_blank" class="org-btn">👑 Omar</a>
      <a href="https://github.com/rhy-collab" target="_blank" class="org-btn">🤓 Rhys</a>
      <a href="https://github.com/QuixThe2nd" target="_blank" class="org-btn">🐱 Pussy</a>
    </div>
  </div>
</div>

<div class="cd-wrap">
  <div class="cd-label">Time until last place is confirmed</div>
  <div class="cd-nums">
    <div class="cd-unit"><span class="cd-val" id="d">---</span><div class="cd-unit-lbl">Days</div></div>
    <div class="cd-unit"><span class="cd-val" id="h">--</span><div class="cd-unit-lbl">Hours</div></div>
    <div class="cd-unit"><span class="cd-val" id="m">--</span><div class="cd-unit-lbl">Mins</div></div>
    <div class="cd-unit"><span class="cd-val" id="s">--</span><div class="cd-unit-lbl">Secs</div></div>
  </div>
</div>

<footer>
  <p>
    <a href="https://github.com/kingomarwashere" target="_blank">👑 King Omar (Claude Pro)</a> &nbsp;·&nbsp;
    <a href="https://github.com/rhy-collab" target="_blank">🤓 Basic Rhys (Codex)</a> &nbsp;·&nbsp;
    <a href="https://github.com/QuixThe2nd" target="_blank">🐱 Pussy (Hermes Plus Ching Chong)</a> &nbsp;·&nbsp;
    🤠 Patty (Copilot &amp; Clawpilot)
  </p>
  <p style="margin-top:8px">Omar's data: live Stripe · Others: self-reported · Refreshes every 60s · No backing out</p>
</footer>

<script>
(function tick(){
  const now = new Date();
  const start = new Date('${START_DATE}');
  const end = new Date('${END_DATE}');
  const diff = Math.max(0, end - now);
  const total = end - start;
  const elapsed = Math.min(Math.max(now - start, 0), total);
  const timePct = total > 0 ? Math.min((elapsed / total) * 100, 100) : 100;
  document.getElementById('d').textContent = String(Math.floor(diff/86400000)).padStart(3,'0');
  document.getElementById('h').textContent = String(Math.floor(diff%86400000/3600000)).padStart(2,'0');
  document.getElementById('m').textContent = String(Math.floor(diff%3600000/60000)).padStart(2,'0');
  document.getElementById('s').textContent = String(Math.floor(diff%60000/1000)).padStart(2,'0');
  document.getElementById('timePct').textContent = timePct.toFixed(1) + '%';
  document.getElementById('timeFill').style.width = timePct + '%';
  document.getElementById('timeNow').style.left = timePct + '%';
  document.getElementById('daysElapsed').textContent = Math.floor(elapsed / 86400000).toLocaleString();
  document.getElementById('daysLeft').textContent = Math.ceil(diff / 86400000).toLocaleString();
  setTimeout(tick, 1000);
})();
</script>
</body>
</html>`;
}
