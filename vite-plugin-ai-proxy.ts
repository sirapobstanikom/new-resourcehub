import type { Plugin } from 'vite';

const API_PATH = '/api/chat';

export function aiProxyPlugin(): Plugin {
  return {
    name: 'ai-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== API_PATH || req.method !== 'POST') {
          return next();
        }

        const apiKey = process.env.OPENAI_API_KEY?.trim();
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'OPENAI_API_KEY not configured in .env' }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', resolve);
            req.on('error', reject);
          });
          const body = JSON.parse(Buffer.concat(chunks).toString());

          const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
          });

          const data = await openaiRes.json();
          res.writeHead(openaiRes.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        } catch (err) {
          console.error('[ai-proxy]', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy error' }));
        }
      });
    },
  };
}
