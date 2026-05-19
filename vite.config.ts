import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig(({ mode }) => ({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact({
      // Enable React DevTools in development
      include: '**/*.{jsx,tsx}',
    }),
  ],

  // Environment variable prefix
  envPrefix: ['VITE_', 'DATABASE_URL', 'NEXTAUTH_'],

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: true,
    },
  },

  // Preview server configuration
  preview: {
    port: 3001,
    host: true,
  },

  // Build configuration
  build: {
    target: 'esnext',
    sourcemap: mode === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },

  // Optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      '@tanstack/react-router',
      '@trpc/client',
      '@trpc/react-query',
      'zod',
      'clsx',
      'tailwind-merge',
    ],
    exclude: ['@prisma/client'],
  },

  // SSR configuration
  ssr: {
    external: ['@prisma/client'],
    noExternal: [],
    // Skip CSS processing for SSR to avoid circular dependency
    target: 'node',
  },
}))

export default config
