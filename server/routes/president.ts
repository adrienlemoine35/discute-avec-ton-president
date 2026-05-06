import { Router, Request, Response } from 'express';
import { askPresident } from '../lib/claude.js';
import { getCacheStats } from '../lib/cache.js';

const router = Router();

router.post('/ask', async (req: Request, res: Response) => {
  const { question } = req.body as { question?: string };

  if (!question || typeof question !== 'string' || question.trim().length < 2) {
    return res.status(400).json({ error: 'Le champ "question" est requis (min 2 caractères).' });
  }
  if (question.length > 1000) {
    return res.status(400).json({ error: 'Question trop longue (max 1000 caractères).' });
  }

  try {
    const result = await askPresident(question.trim());
    return res.json(result);
  } catch (err: any) {
    console.error('[president/ask] Erreur finale:', err?.message ?? err);

    // Réponse de secours en dur — jamais d'erreur 500 côté client
    return res.json({
      answer: "Permettez-moi d'être honnête avec vous : je rencontre en ce moment une difficulté technique qui m'empêche de vous répondre dans les meilleures conditions. En même temps, c'est l'occasion de vous rappeler que la persévérance est au cœur de notre démarche. Veuillez réessayer dans quelques instants.",
      mode: 'styled',
      sources: [],
    });
  }
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), cache: getCacheStats() });
});

export default router;
