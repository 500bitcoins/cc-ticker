# cc-ticker

A Claude Code status line that shows what your session is costing you (in dollars and in SOL) next to live crypto prices.

```
Opus · ctx 8% · $0.43 (0.0029 SOL) · 5h 23% │ BTC $98,210 ▲1.2%  SOL $148.10 ▼0.4%  ETH $3,412 ▲0.3%
```

- Zero dependencies, one file, Node 18+.
- Prices from CoinGecko's free API, cached 60s and refreshed in the background, so the status line never waits on the network.
- Context % turns yellow at 50% and red at 80%.

## Install

```bash
mkdir -p ~/.claude && curl -o ~/.claude/cc-ticker.mjs https://raw.githubusercontent.com/500bitcoins/cc-ticker/main/statusline.mjs
```

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/cc-ticker.mjs",
    "refreshInterval": 30
  }
}
```

## Configure

| env | default | |
|---|---|---|
| `CC_TICKER_COINS` | `bitcoin:BTC,solana:SOL,ethereum:ETH` | CoinGecko ids and the symbol to show |
| `CC_TICKER_PRICE_IN` | `solana` | price the session cost in this coin (`""` to turn off) |
| `CC_TICKER_TTL` | `60` | seconds before prices refresh |
| `NO_COLOR` | unset | plain output |

## Test without Claude Code

```bash
echo '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":42},"cost":{"total_cost_usd":0.43},"rate_limits":{"five_hour":{"used_percentage":23}}}' | node statusline.mjs
```
