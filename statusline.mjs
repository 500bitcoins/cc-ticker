#!/usr/bin/env node
// Claude Code status line: model, context, session cost (also priced in SOL), rate limits, live crypto prices.
// Zero dependencies. Prices come from CoinGecko's free API, cached for 60s and refreshed in the background
// so the status line never waits on the network.
//
//   Opus · ctx 8% · $0.43 (0.0029 SOL) · 5h 23% │ BTC $98,210 ▲1.2%  SOL $148.10 ▼0.4%  ETH $3,412 ▲0.3%
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COINS = (process.env.CC_TICKER_COINS || 'bitcoin:BTC,solana:SOL,ethereum:ETH')
  .split(',').map((s) => s.split(':')).map(([id, sym]) => ({ id, sym: sym || id.toUpperCase() }));
const PRICE_IN = process.env.CC_TICKER_PRICE_IN || 'solana'; // price the session cost in this coin ('' to disable)
const TTL_MS = Number(process.env.CC_TICKER_TTL || 60) * 1000;
const DIR = join(homedir(), '.cache', 'cc-ticker');
const CACHE = join(DIR, 'prices.json');

const C = { dim: '\x1b[2m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', reset: '\x1b[0m' };
const color = process.env.NO_COLOR ? () => '' : (k) => C[k];

async function refresh() {
  const ids = [...new Set([...COINS.map((c) => c.id), PRICE_IN].filter(Boolean))].join(',');
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  mkdirSync(DIR, { recursive: true });
  writeFileSync(CACHE, JSON.stringify(await res.json()));
}

if (process.argv[2] === '--refresh') {
  await refresh().catch(() => {});
  process.exit(0);
}

function readCache() {
  try {
    const age = Date.now() - statSync(CACHE).mtimeMs;
    return { prices: JSON.parse(readFileSync(CACHE, 'utf8')), stale: age > TTL_MS };
  } catch { return { prices: null, stale: true }; }
}

const fmtUsd = (n) => (n >= 1000 ? `$${Math.round(n).toLocaleString('en-US')}` : n >= 1 ? `$${n.toFixed(2)}` : `$${n.toPrecision(3)}`);
const pct = (n) => (n == null ? '' : `${n >= 0 ? color('green') + '▲' : color('red') + '▼'}${Math.abs(n).toFixed(1)}%${color('reset')}`);

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}

const { prices, stale } = readCache();
if (stale) {
  // Fire-and-forget refresh; this run prints whatever is cached.
  spawn(process.execPath, [fileURLToPath(import.meta.url), '--refresh'], { detached: true, stdio: 'ignore' }).unref();
}

const left = [];
if (input.model?.display_name) left.push(input.model.display_name);
const ctx = input.context_window?.used_percentage;
if (ctx != null) left.push(`ctx ${color(ctx >= 80 ? 'red' : ctx >= 50 ? 'yellow' : 'reset')}${Math.round(ctx)}%${color('reset')}`);
const cost = input.cost?.total_cost_usd;
if (cost != null) {
  const inCoin = PRICE_IN && prices?.[PRICE_IN]?.usd ? ` (${(cost / prices[PRICE_IN].usd).toPrecision(2)} ${COINS.find((c) => c.id === PRICE_IN)?.sym || PRICE_IN})` : '';
  left.push(`$${cost.toFixed(2)}${inCoin}`);
}
const five = input.rate_limits?.five_hour?.used_percentage;
if (five != null) left.push(`5h ${Math.round(five)}%`);

const right = prices
  ? COINS.filter((c) => prices[c.id]).map((c) => `${c.sym} ${fmtUsd(prices[c.id].usd)} ${pct(prices[c.id].usd_24h_change)}`).join('  ')
  : `${color('dim')}prices loading…${color('reset')}`;

process.stdout.write(`${left.join(' · ')}${left.length ? ` ${color('dim')}│${color('reset')} ` : ''}${right}\n`);
