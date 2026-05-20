// Vercel serverless entry point — exports the Express app.
// All /api/* requests are rewritten here by vercel.json.
import app from '../server/app.js';
export default app;
