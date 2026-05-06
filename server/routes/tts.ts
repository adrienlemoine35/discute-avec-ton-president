import { Router, Request, Response } from 'express';

const router = Router();

// Cache du voice_id Macron trouvé (cherché une seule fois)
let cachedMacronVoiceId: string | null = null;

async function findMacronVoice(apiKey: string): Promise<string> {
  if (cachedMacronVoiceId) return cachedMacronVoiceId;

  // Recherche dans les voix publiques ElevenLabs
  try {
    const res = await fetch(
      'https://api.elevenlabs.io/v1/shared-voices?search=macron&language=fr&page_size=5',
      { headers: { 'xi-api-key': apiKey } }
    );
    if (res.ok) {
      const data = await res.json();
      const voice = (data.voices ?? []).find((v: any) =>
        v.name?.toLowerCase().includes('macron') && v.language === 'fr'
      ) ?? data.voices?.[0];
      if (voice?.voice_id) {
        cachedMacronVoiceId = voice.voice_id;
        console.log(`[tts] 🎙 Voix trouvée : "${voice.name}" (${voice.voice_id})`);
        return cachedMacronVoiceId!;
      }
    }
  } catch (e) {
    console.warn('[tts] Impossible de chercher la voix Macron:', e);
  }

  // Fallback : voix française masculine de qualité (configurable dans .env)
  cachedMacronVoiceId = process.env.ELEVENLABS_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB';
  console.log(`[tts] Voix par défaut : ${cachedMacronVoiceId}`);
  return cachedMacronVoiceId!;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

router.post('/', async (req: Request, res: Response) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'ELEVENLABS_API_KEY non configurée' });
  }

  const { text } = req.body as { text?: string };
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Champ "text" requis' });
  }

  const cleanText = stripMarkdown(text).slice(0, 1200);

  try {
    const voiceId = await findMacronVoice(apiKey);

    const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.80,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
    });

    if (!elRes.ok) {
      const errBody = await elRes.text();
      console.error('[tts] ElevenLabs error:', elRes.status, errBody.slice(0, 200));
      // Quota épuisé → on invalide le cache pour retenter la prochaine fois
      if (elRes.status === 401 || elRes.status === 422) cachedMacronVoiceId = null;
      return res.status(502).json({ error: `ElevenLabs: ${elRes.status}` });
    }

    const audioBuffer = await elRes.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-store');
    res.send(Buffer.from(audioBuffer));
  } catch (err: any) {
    console.error('[tts] Erreur:', err.message);
    res.status(500).json({ error: 'Erreur TTS' });
  }
});

export default router;
