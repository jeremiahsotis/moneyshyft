import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const moduleApiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3002';
  const adminApiProxyTarget = env.VITE_ADMIN_API_PROXY_TARGET || 'http://127.0.0.1:3100';
  const devHost = env.VITE_DEV_HOST || '127.0.0.1';
  const devPort = Number(env.VITE_DEV_PORT || 5173);

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: devPort,
      host: devHost,
      strictPort: false,
      hmr: {
        host: devHost,
      },
      proxy: {
        '/api/v1/platform/admin': {
          target: adminApiProxyTarget,
          changeOrigin: true,
        },
        '/api/v1/auth': {
          target: adminApiProxyTarget,
          changeOrigin: true,
        },
        '/api': {
          target: moduleApiProxyTarget,
          changeOrigin: true,
        }
      }
    }
  };
});
