import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a customer success intelligence analyst for TaxDome, a practice management SaaS for accounting firms. Analyze account data signals and extract actionable insights for the Customer Success team.

Given a structured bundle of account data (CRM metrics, product usage, recent emails, call transcripts), you must:
1. Assess overall account health in plain language
2. Identify risk signals — churn indicators, disengagement, satisfaction issues, sponsor changes, competitive threats
3. Identify expansion signals — seat capacity pressure, power usage, growth indicators, upsell receptivity
4. Synthesize the qualitative context from recent emails and calls into a coherent narrative

Rules:
- Be specific — cite actual data points as evidence, not generic statements
- Severity/confidence should reflect real signal strength, not defaults
- If a data source is empty, work with what you have; don't fabricate signals
- Return ONLY a JSON object with no surrounding text, markdown, or explanation

Required output schema:
{
  "health_summary": "1-2 sentence plain-language assessment",
  "risk_signals": [
    { "signal": "short label", "evidence": "specific supporting detail", "severity": "low|med|high" }
  ],
  "expansion_signals": [
    { "signal": "short label", "evidence": "specific supporting detail", "confidence": "low|med|high" }
  ],
  "recent_qual_notes": "2-3 sentence synthesis of recent email and call context",
  "suggested_next_action": "single concrete action the CSAM should take this week"
}`;

let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file.');
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export async function analyzeAccount(bundle) {
  const client = getClient();
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

  const userContent = formatBundle(bundle);

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userContent }],
  });

  const raw = response.content[0]?.text || '';

  // Extract JSON — Claude may occasionally wrap it in a code fence
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Claude returned unparseable output: ${raw.slice(0, 200)}`);
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`JSON parse failed on Claude output: ${jsonMatch[0].slice(0, 200)}`);
  }
}

function formatBundle(bundle) {
  const { account, taxdome, gmail, fathom, sources_used } = bundle;

  const lines = [
    `## Account: ${account.company_name}`,
    ``,
    `### CRM (HubSpot)`,
    `- MRR: $${account.mrr} / ARR: $${account.arr}`,
    `- CSAM Owner: ${account.csam_owner}`,
    `- Lifecycle Stage: ${account.lifecycle_stage}`,
    `- Renewal Date: ${account.renewal_date || 'Unknown'}`,
    `- Seat Fill: ${account.seat_fill_pct != null ? Math.round(account.seat_fill_pct * 100) + '%' : 'N/A'}`,
    `- Days Since Last Login: ${account.days_since_last_login ?? 'N/A'}`,
    `- Workflow Adoption: ${account.workflow_adoption != null ? Math.round(account.workflow_adoption * 100) + '%' : 'N/A'}`,
  ];

  if (taxdome && sources_used.taxdome) {
    lines.push(
      ``,
      `### Product Usage (TaxDome)`,
      `- Active Users: ${taxdome.active_users} / ${taxdome.total_seats} seats`,
      `- Last Login: ${taxdome.last_login_date}`,
      `- Workflows built: ${taxdome.workflow_count}, Automations: ${taxdome.automation_count}`,
      `- Client Portal Adoption: ${Math.round((taxdome.client_portal_adoption_pct || 0) * 100)}%`,
      `- Docs uploaded (30d): ${taxdome.documents_uploaded_30d}`,
      `- Tasks completed (30d): ${taxdome.tasks_completed_30d}`,
      `- Features enabled: ${Object.entries(taxdome.features || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}`,
    );
  }

  if (gmail?.length && sources_used.gmail) {
    lines.push(``, `### Recent Emails (last ${gmail.length} threads)`);
    gmail.forEach((t) => {
      lines.push(
        `- [${t.direction.toUpperCase()}] ${t.date} | "${t.subject}"`,
        `  > ${t.snippet}`,
      );
    });
  }

  if (fathom?.length && sources_used.fathom) {
    lines.push(``, `### Call Transcripts (last 90 days)`);
    fathom.forEach((c) => {
      lines.push(
        `- ${c.call_date} | ${c.duration_min} min | Participants: ${c.participants.join(', ')}`,
        `  Summary: ${c.transcript_summary}`,
        `  Sentiment: ${c.sentiment}`,
        c.action_items?.length ? `  Action items: ${c.action_items.join('; ')}` : '',
      );
    });
  }

  if (!sources_used.gmail && !sources_used.fathom) {
    lines.push(``, `_Note: Gmail and Fathom sources are disabled (pending InfoSec approval). Analysis based on CRM and product usage only._`);
  }

  return lines.filter((l) => l !== undefined).join('\n');
}
