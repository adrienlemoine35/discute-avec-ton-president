import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import presidentRouter from './routes/president.js';
import ttsRouter from './routes/tts.js';

dotenv.config({ path: '../.env', override: true });

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000';

app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/president', presidentRouter);
app.use('/api/tts', ttsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable.' });
});

const server = app.listen(PORT, () => {
  console.log(`\n🇫🇷  President API démarré sur http://localhost:${PORT}`);
  console.log(`   POST http://localhost:${PORT}/api/president/ask`);
  console.log(`   GET  http://localhost:${PORT}/api/president/health\n`);
});

// Fermeture propre pour éviter EADDRINUSE sur hot-reload tsx watch
const shutdown = () => {
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
