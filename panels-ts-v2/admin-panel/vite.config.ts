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
        '@shared': path.resolve(__dirname, '../shared'),
      },
      // Игнорируем .d.ts файлы при разрешении модулей
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    server: {
      port: Number(process.env.PORT) || 3001,
      strictPort: true,
      proxy: {
        '/api': {
          target: process.env.VITE_API_PROXY_TARGET || 'https://api.yessgo.org',  // Backend API (override with env)
          changeOrigin: true,
          secure: false,
          // В некоторых окружениях внешний API ожидает пути без префикса `/api`.
          // Убираем префикс `/api` при проксировании чтобы попасть в корневые эндпоинты, например `/admin/auth/login`.
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/api/v1/ws': {
          target: (process.env.VITE_API_PROXY_TARGET_WS || process.env.VITE_API_PROXY_TARGET) || 'wss://api.yessgo.org',  // WebSocket (override if needed)
          changeOrigin: true,
          ws: true,
          secure: false,
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
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
          passes: 2, // Множественные проходы для лучшей оптимизации
        },
        format: {
          comments: false, // Удалить комментарии
        },
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Разделение на чанки для лучшего кеширования
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              if (id.includes('antd')) {
                return 'antd-vendor';
              }
              if (id.includes('@tanstack/react-query')) {
                return 'query-vendor';
              }
              if (id.includes('axios')) {
                return 'http-vendor';
              }
              if (id.includes('recharts') || id.includes('leaflet')) {
                return 'charts-vendor';
              }
              // Остальные node_modules
              return 'vendor';
            }
          },
          // Оптимизация имен файлов
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[ext]/[name]-[hash][extname]`;
          },
        },
        // Tree shaking
        treeshake: {
          preset: 'recommended',
          moduleSideEffects: false,
        },
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: !isProduction, // Source maps только в development
      reportCompressedSize: true,
      cssCodeSplit: true,
      cssMinify: isProduction, // Минификация CSS
      target: 'es2015', // Поддержка более старых браузеров
      // Обеспечиваем совместимость
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
      // Оптимизация размера
      assetsInlineLimit: 4096, // Инлайнить маленькие файлы (<4KB)
    },
  };
});
