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
      answer: "Permettez-moi de vous répondre très directement et avec franchise : sur ce sujet central pour notre pays, notre engagement et notre cap demeurent constants pour bâtir l'avenir de la Nation.",
      mode: 'styled',
      sources: [],
    });
  }
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), cache: getCacheStats() });
});

export default router;
