import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: [{ find: /^@icons$/, replacement: fileURLToPath(new URL('./src/icons.js', import.meta.url)) }] },
  server: { proxy: { '/api': 'http://localhost:4000' } },
})
