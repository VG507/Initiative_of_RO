import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' + HashRouter => проект деплоится в GitHub Pages в любой репозиторий/ветку
export default defineConfig({
  base: './',
  plugins: [react()],
})