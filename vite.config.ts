import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensure assets are referenced relatively
  server: {
    host: "0.0.0.0", // IPv4 only — WSL localhost relay skips dual-stack (::) binds
    port: 5280, // dedicated port — food-finder uses 5173
    allowedHosts: true, // accept *.ts.net host (Tailscale serve)
  },
})
