import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './backend/server';

async function startDevServer() {
  const app = express();
  const apiApp = createApp();

  // Mount the API (from backend/server.ts) under /api
  app.use(apiApp);

  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[dev server] error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`CleanCollect dev server (UI + API) listening on http://localhost:${port}`);
  });
}

startDevServer();