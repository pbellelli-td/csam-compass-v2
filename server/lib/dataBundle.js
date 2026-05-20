import { getTaxDomeData } from '../services/taxdome.js';
import { getGmailThreads } from '../services/gmail.js';
import { getFathomTranscripts } from '../services/fathom.js';

export async function assembleDataBundle(account) {
  const enableTaxdome = process.env.ENABLE_TAXDOME !== 'false'; // on by default (fixture)
  const enableGmail = process.env.ENABLE_GMAIL === 'true';
  const enableFathom = process.env.ENABLE_FATHOM === 'true';

  const [taxdome, gmail, fathom] = await Promise.allSettled([
    enableTaxdome ? getTaxDomeData(account.id) : Promise.resolve(null),
    enableGmail ? getGmailThreads(account.id, account.company_name) : Promise.resolve([]),
    enableFathom ? getFathomTranscripts(account.id) : Promise.resolve([]),
  ]);

  const safeValue = (result, fallback) =>
    result.status === 'fulfilled' ? result.value : fallback;

  return {
    account,
    taxdome: safeValue(taxdome, null),
    gmail: safeValue(gmail, []),
    fathom: safeValue(fathom, []),
    sources_used: {
      hubspot: true,
      taxdome: enableTaxdome && safeValue(taxdome, null) !== null,
      gmail: enableGmail && safeValue(gmail, []).length > 0,
      fathom: enableFathom && safeValue(fathom, []).length > 0,
    },
  };
}
