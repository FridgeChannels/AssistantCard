import './env.js'; // 必须在最前：先加载 .env / .env.local
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSupabaseClient } from './supabaseClient.js';
import { registerApiRoutes } from './apiRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4173;
const supabase = createSupabaseClient();

// ---------------- Common middleware ----------------

app.use(cors());
app.use(express.json());

registerApiRoutes(app, supabase);

// ---------------- Static front-end serving ----------------

const distPath = path.resolve(__dirname, '../dist');

app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AssistantCard server listening on http://0.0.0.0:${PORT}`);
});

