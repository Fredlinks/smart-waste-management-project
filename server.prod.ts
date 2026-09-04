import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express, { type Request, type Response, type NextFunction } from 'express';
import { createApp } from './backend/server';

function resolveDist(): string {
  // In dev this file is at the project root. In prod the bundle is at
  // <project>/dist-server.cjs, and the SPA assets live next to it under
  // dist/. We resolve relative to this file so it works from both layouts.
  const candidates = [
    path.resolve(process.cwd(), 'dist'),
    path.resolve(__dirname, 'dist'),
    path.resolve(__dirname, '..', 'dist'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'index.html'))) return c;
  }
  return candidates[0];
}

function start() {
  const distDir = resolveDist();
  const app = express();
  const apiApp = createApp();

  // API under /api
  app.use(apiApp);

  // Static SPA assets (hashed bundles live under dist/assets/)
  app.use(
    express.static(distDir, {
      index: false,
      maxAge: '1y',
      immutable: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );

  // SPA fallback: any non-/api GET returns index.html so the client router
  // (and our ?auth=… URL sync) keep working on hard refresh.
  app.get(/^(?!\/api(\/|$)).*/, (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    const indexPath = path.join(distDir, 'index.html');
    fs.access(indexPath, fs.constants.F_OK, (err) => {
      if (err) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexPath);
    });
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[server] error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`CleanCollect production server (UI + API) listening on http://${host}:${port}`);
    console.log(`Serving SPA from ${distDir}`);
  });
}

start();
