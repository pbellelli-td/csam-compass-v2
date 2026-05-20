import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, '../fixtures/gmail.json');

const THREADS_PER_ACCOUNT = parseInt(process.env.GMAIL_THREADS_PER_ACCOUNT || '10', 10);

function isLive() {
  return (
    process.env.ENABLE_GMAIL === 'true' &&
    !!process.env.GMAIL_CLIENT_ID &&
    !!process.env.GMAIL_CLIENT_SECRET &&
    !!process.env.GMAIL_REFRESH_TOKEN
  );
}

function loadFixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
}

export async function getGmailThreads(accountId, companyName) {
  if (!isLive()) {
    const all = loadFixture();
    return all[accountId] || [];
  }

  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

  const gmail = google.gmail({ version: 'v1', auth });

  const listRes = await gmail.users.threads.list({
    userId: 'me',
    q: `"${companyName}"`,
    maxResults: THREADS_PER_ACCOUNT,
  });

  const threads = listRes.data.threads || [];

  const detailed = await Promise.all(
    threads.map(async (t) => {
      const threadRes = await gmail.users.threads.get({
        userId: 'me',
        id: t.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'Date', 'From', 'To'],
      });
      const firstMsg = threadRes.data.messages?.[0];
      const lastMsg = threadRes.data.messages?.at(-1);
      const headers = firstMsg?.payload?.headers || [];

      const subject = headers.find((h) => h.name === 'Subject')?.value || '(no subject)';
      const date = headers.find((h) => h.name === 'Date')?.value || '';
      const from = lastMsg?.payload?.headers?.find((h) => h.name === 'From')?.value || '';

      return {
        thread_id: t.id,
        subject,
        date: new Date(date).toISOString().split('T')[0],
        direction: from.toLowerCase().includes(process.env.GMAIL_CSAM_DOMAIN || '@taxdome.com')
          ? 'outbound'
          : 'inbound',
        snippet: threadRes.data.messages?.at(-1)?.snippet || '',
      };
    })
  );

  return detailed;
}
