import express from 'express';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const app = express();
const port = Number(process.env.PORT || 8787);
const magnificApiKey = process.env.MAGNIFIC_API_KEY || '';
const magnificApiBase = process.env.MAGNIFIC_API_BASE || 'https://api.magnific.com/v1';
const execFileAsync = promisify(execFile);

app.use(express.json({ limit: '2mb' }));

const demoAssets = [
  {
    id: 'mgf-demo-001',
    title: 'Chrome product render with wet pavement reflection',
    type: 'image',
    source: 'Magnific creation',
    tags: ['product', 'cinematic', 'high-contrast', 'night'],
    lastUsed: '18 days ago',
    performance: 92,
    thumbnail: '/thumbs/product.jpg',
  },
  {
    id: 'mgf-demo-002',
    title: 'Neon warehouse fashion reel frames',
    type: 'video',
    source: 'Magnific video',
    tags: ['fashion', 'motion', 'industrial', 'blue-coral'],
    lastUsed: '42 days ago',
    performance: 87,
    thumbnail: '/thumbs/fashion.jpg',
  },
  {
    id: 'mgf-demo-003',
    title: 'Editorial table-top coffee campaign tests',
    type: 'image',
    source: 'Magnific stock + remix',
    tags: ['food', 'editorial', 'warm light', 'macro'],
    lastUsed: '67 days ago',
    performance: 78,
    thumbnail: '/thumbs/coffee.jpg',
  },
  {
    id: 'mgf-demo-004',
    title: 'Unused voiceover takes for mini-documentary',
    type: 'audio',
    source: 'Magnific audio',
    tags: ['voice', 'documentary', 'intimate', 'calm'],
    lastUsed: '91 days ago',
    performance: 74,
    thumbnail: '/thumbs/audio.jpg',
  },
];

const demoOpportunities = [
  {
    id: 'opp-brief-reel',
    rank: 1,
    confidence: 94,
    title: 'Turn the neon fashion archive into a 12-second launch reel',
    format: 'Video workflow',
    whyNow: 'Your strongest unused motion assets share a cobalt/coral palette, and Magnific video models can extend them into a coherent micro-story.',
    sourceIds: ['mgf-demo-002', 'mgf-demo-001'],
    estimatedCredits: 38,
    expectedOutput: '3-shot vertical reel, campaign caption, thumbnail still',
    prompt: 'Create a cinematic 12-second vertical fashion reel from the attached neon warehouse frames. Preserve industrial mood, cobalt shadows, coral rim light, fast editorial pacing, premium texture, no generic runway poses.',
    workflow: ['creations_search', 'video_generate', 'images_upscale', 'creations_move'],
    checks: {
      privacy: 'Pass: no faces marked private, no client NDA tags.',
      taste: 'Pass: matches high-contrast cinematic preference and rejected generic studio lighting.',
      critic: 'Pass after tightening: removed broad “futuristic fashion” wording.',
    },
  },
  {
    id: 'opp-product-shot',
    rank: 2,
    confidence: 88,
    title: 'Refresh the chrome product shot into a three-image campaign set',
    format: 'Image generation + upscale',
    whyNow: 'The asset is high-performing but old. The agent found stock surfaces and lighting references that fit your past approvals.',
    sourceIds: ['mgf-demo-001'],
    estimatedCredits: 24,
    expectedOutput: 'Hero image, detail crop, square social variation',
    prompt: 'Generate three product campaign stills using the chrome product render as visual reference. Keep wet pavement reflections, premium night lighting, tactile detail, minimal copy space, editorial realism.',
    workflow: ['creations_get', 'resources_search', 'images_generate', 'images_upscale'],
    checks: {
      privacy: 'Pass: product-only visual set.',
      taste: 'Pass: uses your approved wet-reflection motif and avoids flat catalog lighting.',
      critic: 'Needs review: risk of over-polished CGI, ask Magnific for photographic imperfections.',
    },
  },
  {
    id: 'opp-doc-thread',
    rank: 3,
    confidence: 81,
    title: 'Recover the voiceover takes as a short creator process post',
    format: 'Audio + editorial package',
    whyNow: 'The archive contains unused narration that can become a behind-the-scenes post instead of another generated asset.',
    sourceIds: ['mgf-demo-004', 'mgf-demo-003'],
    estimatedCredits: 12,
    expectedOutput: 'Narrated clip outline, 5-slide carousel plan, caption',
    prompt: 'Build a creator-process micro-documentary package from these voiceover takes and coffee campaign frames. Tone: intimate, practical, no inspirational cliches, show process and judgment.',
    workflow: ['creations_search', 'audio_tts', 'images_resize', 'images_generate'],
    checks: {
      privacy: 'Pass: no private names detected in transcript excerpt.',
      taste: 'Medium: strong documentary tone but user often rejects sentimental language.',
      critic: 'Hold: caption should be rewritten less motivational.',
    },
  },
];

function magnificHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-magnific-api-key': magnificApiKey,
  };
}

async function callMagnific(path, options = {}) {
  if (!magnificApiKey) {
    return {
      demo: true,
      reason: 'MAGNIFIC_API_KEY is not set; returning hackathon demo data.',
    };
  }

  const response = await fetch(`${magnificApiBase}${path}`, {
    ...options,
    headers: {
      ...magnificHeaders(),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || payload?.error || `Magnific API returned ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    mode: magnificApiKey ? 'magnific-api' : 'demo',
    magnificApiBase,
  });
});

app.get('/api/editing/capabilities', async (_request, response) => {
  async function commandPath(command) {
    try {
      const { stdout } = await execFileAsync('/usr/bin/which', [command]);
      return stdout.trim();
    } catch {
      return '';
    }
  }

  const [ffmpegPath, opencutPath, reclipPath] = await Promise.all([
    commandPath('ffmpeg'),
    commandPath('opencut'),
    commandPath('reclip'),
  ]);

  response.json({
    ffmpeg: Boolean(ffmpegPath),
    opencut: Boolean(opencutPath),
    reclip: Boolean(reclipPath),
    ffmpegPath,
    opencutPath,
    reclipPath,
  });
});

app.get('/api/magnific/archive', async (request, response) => {
  try {
    if (!magnificApiKey) {
      response.json({ mode: 'demo', assets: demoAssets });
      return;
    }

    const query = String(request.query.query || 'creator campaign archive');
    const data = await callMagnific(`/resources?query=${encodeURIComponent(query)}&limit=12`);
    response.json({ mode: 'magnific-api', assets: data?.data || data?.resources || data });
  } catch (error) {
    response.status(502).json({ error: error.message });
  }
});

app.post('/api/agent/opportunities', async (request, response) => {
  const { profile, feedback = [] } = request.body || {};
  const penalties = new Set(
    feedback
      .filter((item) => item.action === 'reject')
      .map((item) => item.opportunityId),
  );
  const revised = demoOpportunities.map((item) => {
    const tasteLift = profile?.tasteRules?.includes('documentary') && item.id === 'opp-doc-thread' ? 6 : 0;
    const penalty = penalties.has(item.id) ? -14 : 0;
    return {
      ...item,
      confidence: Math.max(52, Math.min(98, item.confidence + tasteLift + penalty)),
    };
  });

  revised.sort((a, b) => b.confidence - a.confidence);
  response.json({
    mode: magnificApiKey ? 'magnific-ready' : 'demo',
    opportunities: revised,
    agentTrace: [
      'Archivist: scanned Magnific creations, stock candidates, tags, and stale high-signal assets.',
      'Taste Agent: compared candidates against approvals, rejections, edit notes, and explicit style rules.',
      'Strategy Agent: selected workflows that use existing assets before creating new content.',
      'Privacy Agent: blocked private faces, client names, and forbidden folders before draft generation.',
      'Critic Agent: rejected generic or embarrassing outputs before the creator review queue.',
    ],
  });
});

app.post('/api/magnific/run', async (request, response) => {
  const { opportunity } = request.body || {};
  if (!opportunity) {
    response.status(400).json({ error: 'Missing opportunity' });
    return;
  }

  try {
    if (!magnificApiKey) {
      response.json({
        mode: 'demo',
        status: 'queued-for-magnific',
        handoff: {
          title: opportunity.title,
          workflow: opportunity.workflow,
          prompt: opportunity.prompt,
          note: 'Set MAGNIFIC_API_KEY to execute this handoff against the Magnific REST API.',
        },
      });
      return;
    }

    const data = await callMagnific('/ai/text-to-image', {
      method: 'POST',
      body: JSON.stringify({
        prompt: opportunity.prompt,
        guidance_scale: 1.6,
        num_images: 1,
        image: { size: 'square_1_1' },
        filter_nsfw: true,
      }),
    });
    response.json({ mode: 'magnific-api', status: 'created', result: data });
  } catch (error) {
    response.status(502).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`TasteOS server listening on http://localhost:${port}`);
});
