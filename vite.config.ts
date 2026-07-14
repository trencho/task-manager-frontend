import {fileURLToPath, URL} from 'node:url';
// Import from 'vitest/config' (not 'vite') so the `test` block is type-checked.
import {defineConfig} from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },

    define: {
        // Vue CLI set this through webpack.DefinePlugin in vue.config.js.
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
    },

    server: {
        port: 8080,
        // Replaces the devServer.proxy block from vue.config.js. Requests are relative
        // (`/api/...`) whenever VITE_API_URL is unset, so the dev server forwards them to a
        // backend running on the host. `http://spring` only resolves inside the compose
        // network, which is why it cannot be the default here.
        proxy: {
            '/api': {
                target: process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:80',
                changeOrigin: true,
                secure: false
            }
        }
    },

    build: {
        // nginx serves from here; the Dockerfile copies dist/ to /usr/share/nginx/html.
        outDir: 'dist'
    },

    test: {
        environment: 'jsdom',
        globals: true,
        include: ['src/tests/**/*.spec.{js,ts}'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{js,ts,vue}'],
            exclude: ['src/tests/**', 'src/main.{js,ts}', 'src/env.d.ts']
        }
    }
});
