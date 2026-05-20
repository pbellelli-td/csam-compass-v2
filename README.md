# CSAM Compass v2 — Phase 1

AI revenue intelligence for the TaxDome CSAM team. Replaces manual triage with auto-ingested signals across the book of business.

## What's in Phase 1

- **Data ingestion** from HubSpot, TaxDome usage, Gmail, and Fathom (fixtures used for any source not yet credentialed)
- **Claude API** per-account analysis → structured JSON (health summary, risk signals, expansion signals, qual notes, next action)
- **Account list** — sortable/filterable table with health badge
- **Account detail** — quant metrics + full Claude analysis

## Quick start

### 1. Clone and install

```bash
cd csam-compass-v2
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Everything else can stay as-is for a fixture-only demo.

### 3. Run

```bash
npm run dev
```

- Client: http://localhost:5173
- API:    http://localhost:3001

---

## Data sources

| Source | Status | How to enable |
|--------|--------|--------------|
| TaxDome usage | ✅ Fixture ready | Set `ENABLE_TAXDOME=true` + `TAXDOME_API_KEY` |
| HubSpot CRM | ✅ Fixture ready | Set `ENABLE_HUBSPOT=true` + `HUBSPOT_API_KEY` |
| Gmail | ⏳ Pending InfoSec | Set `ENABLE_GMAIL=true` + OAuth2 credentials |
| Fathom transcripts | ⏳ Pending InfoSec | Set `ENABLE_FATHOM=true` + `FATHOM_API_KEY` |

When a source is disabled (`ENABLE_X=false`), the server uses the fixture file in `server/fixtures/`. Swap is a one-line env change.

## HubSpot custom property names

Your HubSpot account may use different property names. Configure them in `.env`:

```
HUBSPOT_PROP_SEAT_FILL=seat_fill_pct
HUBSPOT_PROP_LAST_LOGIN=days_since_last_login
HUBSPOT_PROP_WORKFLOW=workflow_adoption
```

## Gmail setup (when InfoSec approves)

1. Create a Google Cloud project and enable the Gmail API
2. Create OAuth2 credentials (Desktop app type)
3. Run the OAuth flow to get a refresh token
4. Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` in `.env`
5. Set `ENABLE_GMAIL=true`

The server's `gmail.js` queries threads matching the company name. Set `GMAIL_THREADS_PER_ACCOUNT` (default: 10).

## Claude model

Default: `claude-sonnet-4-6`. Override via `CLAUDE_MODEL` in `.env`.

The system prompt is sent with `cache_control: ephemeral` to benefit from prompt caching across repeated calls in the same session.

## Project structure

```
csam-compass-v2/
├── server/
│   ├── index.js               Express entry point
│   ├── routes/accounts.js     GET /api/accounts, POST /:id/analyze
│   ├── services/
│   │   ├── hubspot.js         HubSpot CRM (live or fixture)
│   │   ├── taxdome.js         TaxDome usage (live or fixture)
│   │   ├── gmail.js           Gmail threads (live or fixture)
│   │   ├── fathom.js          Fathom transcripts (live or fixture)
│   │   └── claude.js          Anthropic API call + JSON parse
│   ├── lib/dataBundle.js      Assembles all 4 sources per account
│   └── fixtures/              Stub JSON — structured like real API responses
└── client/
    └── src/
        ├── pages/
        │   ├── AccountList.jsx    Sortable/filterable account table
        │   └── AccountDetail.jsx  Quant metrics + Claude analysis
        └── components/
            ├── MetricCard.jsx
            ├── SignalCard.jsx
            └── SeverityBadge.jsx
```

## Phase 2 / 3 (not in scope here)

- "5 to save / 5 to expand" ranked lists with CSAM-tunable weights
- Done / snooze close-loop actions
- Slack alerts on signal changes
