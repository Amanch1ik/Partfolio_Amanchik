import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3001,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      // Production оптимизации
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction, // Удалить console.log в production
          drop_debugger: isProduction,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'antd-vendor': ['antd'],
            'query-vendor': ['@tanstack/react-query'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: !isProduction, // Source maps только в development
      reportCompressedSize: true,
      cssCodeSplit: true,
      target: 'es2015', // Поддержка более старых браузеров
      // Обеспечиваем совместимость
      commonjsOptions: {
        include: [/node_modules/],
      },
    },
  };
});

