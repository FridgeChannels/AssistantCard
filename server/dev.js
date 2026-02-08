import './env.js'; // 必须在最前：先加载 .env / .env.local，否则 apiRoutes 等读不到变量
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { createSupabaseClient } from './supabaseClient.js';
import { registerApiRoutes } from './apiRoutes.js';

const PORT = 5173;

async function start() {
  const app = express();
  const supabase = createSupabaseClient();

  app.use(cors());
  app.use(express.json());

  // API routes first
  registerApiRoutes(app, supabase);

  // Vite middleware (serves front-end on same port)
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, () => {
    console.log(`Dev server (API + Vite) running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start dev server:', err);
  process.exit(1);
});
