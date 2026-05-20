// Local dev entry point — not used by Vercel (which uses api/index.js)
import app from './app.js';

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  CSAM Compass API  →  http://localhost:${PORT}\n`);
  const sources = ['HUBSPOT', 'TAXDOME', 'GMAIL', 'FATHOM'].map(
    (s) => `  ${s}: ${process.env[`ENABLE_${s}`] === 'true' ? '✓ live' : '○ fixture'}`
  );
  console.log('  Data sources:\n' + sources.join('\n') + '\n');
});
