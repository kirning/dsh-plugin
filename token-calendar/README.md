# dsh-token-calendar

A token consumption calendar for the dsh web GUI, built on the statistics of
the **magpie** gateway installed on this machine (`D:\software\magpie`).

The sidebar entry 「Token 日历」 shows a month grid: every day with traffic
carries its token count and its spend, tinted by how heavy that day was.
Clicking a day opens the model and provider breakdown for it. The agent gets
the same numbers through the `token_calendar` tool.

## Where the numbers come from

magpie keeps its statistics in plain files, so the plugin works whether or not
magpie is running:

| file                                      | content                                       |
| ----------------------------------------- | --------------------------------------------- |
| `~/.config/magpie/usage.jsonl`            | one JSON object per proxied request           |
| `~/.config/magpie/providers.json`         | the user's providers and the catalog each maps to |
| `~/.cache/magpie/models.json`             | models.dev catalog with per-token prices      |
| `~/.cache/magpie/fxrate.json`             | the USD/CNY rate used for display             |

A ledger record looks like this:

```json
{ "t": "2026-10-28T09:53:35.33+08:00", "agent": "dsh", "provider": "minimax-cn",
  "model": "MiniMax-M3.1-Flash", "in": 506611, "out": 2811,
  "cache_read": 58154, "cache_write": 0, "reasoning": 2499, "status": 200 }
```

* **tokens** = `in + out + cache_read + cache_write`. Reasoning tokens are
  counted separately because providers already include them in `out`.
* **cost** = the per-token price of the model in the models.dev catalog
  (`input`, `output`, `cache_read`, `cache_write`, USD per million tokens),
  multiplied by the USD/CNY rate magpie cached. Context-size tiers
  (`context_over_200k`) are applied when the request's context is that large.
* **provider → catalog**: the ledger's provider id is magpie's own id, which
  `providers.json` maps to a catalog id. When a model is missing from that
  catalog, the same model id is looked up in the other catalogs and the price
  is flagged as an estimate (the panel shows the estimated share).
* **subscription plans** (`*-coding-plan`, `opencode-go`, …) have a price of
  zero, so they add tokens but no cash. Their consumption shows up in
  `credits`, which the panel reports next to the spend.
* **unpriced models** (free tiers, `auto` routes) count their tokens and add
  nothing to the cost; the number of such requests is reported.

## Configuration

The plugin row's `config` accepts:

```yaml
- id: token-calendar
  name: 'dsh-token-calendar'
  config:
    enabled: true
    announceToAgent: true
    defaultCurrency: 'cny'      # 'cny' | 'usd'
    cacheTtlMs: 15000
    usageFile: '~/.config/magpie/usage.jsonl'
    providersFile: '~/.config/magpie/providers.json'
    modelsFile: '~/.cache/magpie/models.json'
    fxFile: '~/.cache/magpie/fxrate.json'
```

## HTTP surface

`GET /api/dsh-token-calendar/month?month=YYYY-MM&agent=<name>` returns the
calendar rows, the totals and the breakdowns; `GET .../range?from=&to=`
returns the days between two dates; `GET .../sources` reports the files
behind the numbers. All three are loopback-only.

## The agent tool

`token_calendar` with the actions `month`, `day`, `range`, `summary` and
`sources`. It shares one service with the panel, so the model and the UI
never disagree about a month.

## Notes

* The ledger is append-only and may grow large; past 64 MiB only the tail is
  read. A half-written last line is skipped rather than failing the read.
* The calendar covers the period magpie has been recording. Earlier history
  lives wherever magpie was already running, not in this machine's ledger.
