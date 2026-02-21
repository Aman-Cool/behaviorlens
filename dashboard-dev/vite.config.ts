import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const parentSrc = path.resolve(__dirname, '../src');

/**
 * Resolve bare imports (zustand, framer-motion, etc.) that originate from
 * files in the parent src/ directory against THIS project's node_modules.
 * Without this, Vite would look in ../node_modules which doesn't exist.
 */
function resolveFromDevNodeModules() {
  return {
    name: 'resolve-from-dev-node-modules',
    resolveId(source: string, importer: string | undefined) {
      // Only intercept bare specifiers (not . / or virtual)
      if (!source || source[0] === '.' || source[0] === '/') return null;
      // Only when importer lives in the parent src/
      if (!importer || !importer.startsWith(parentSrc)) return null;
      try {
        return require.resolve(source, { paths: [__dirname] });
      } catch {
        return null;
      }
    },
  };
}

export default defineConfig({
  plugins: [resolveFromDevNodeModules(), react()],
  resolve: {
    alias: {
      '@': parentSrc,
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
