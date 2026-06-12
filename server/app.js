import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import accountsRouter from './routes/accounts.js';
import ritualRouter from './routes/ritual.js';

const app = express();

// In production (Vercel) allow any origin; in dev restrict to Vite's port
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '2mb' }));

app.use('/api/accounts', accountsRouter);
app.use('/api/ritual', ritualRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

export default app;
