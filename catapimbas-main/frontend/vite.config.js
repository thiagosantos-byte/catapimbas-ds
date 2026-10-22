import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = String(process.env.VITE_API_URL || env.VITE_API_URL || '').trim().replace(/\/+$/, '');

  if (mode === 'production') {
    if (!apiUrl) {
      throw new Error('Configure VITE_API_URL no ambiente de build da Vercel (URL HTTPS da API Render terminando em /api).');
    }
    let parsed;
    try { parsed = new URL(apiUrl); } catch { throw new Error('VITE_API_URL não é uma URL válida.'); }
    if (parsed.protocol !== 'https:' || parsed.pathname.replace(/\/+$/, '') !== '/api') {
      throw new Error('VITE_API_URL de produção deve usar HTTPS e terminar em /api.');
    }
  }

  return { plugins: [react()] };
});
