import { webcrypto } from 'node:crypto';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Some Node.js builds (notably the Windows Node runtime used by Azure App
// Service during deployment) do not expose the Web Crypto API on `globalThis`,
// which Vite's config resolution relies on. Provide it from Node's crypto
// module when it is missing so `vite build` can run in those environments.
if (!globalThis.crypto?.getRandomValues) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

// Vite build for the React Web Chat client.
//
// - Dev (`npm run dev`): serves the app on :3000 and proxies the token/health
//   endpoints to the Express backend (`server.js`, :8080) so the same JWT flow
//   used in production works locally without CORS glue.
// - Prod (`npm run build`): emits a static bundle to `dist/`, which Express serves.
//
// `global: 'globalThis'` shims the Node-style `global` reference that some
// Bot Framework Web Chat transitive dependencies expect when run in the browser.
// The component gallery (`npm run gallery`, GALLERY=1) renders the pure
// <MessageView> in isolation and never imports Bot Framework Web Chat. Scoping
// the dependency scan to `gallery.html` keeps Vite from pre-bundling Web Chat
// (and its heavy core-js transitive deps) for a workshop that does not use it —
// which also sidesteps endpoint-security quarantines of core-js internals.
const isGallery = process.env.GALLERY === '1';

// The Speech SDK's CommonJS build (`distrib/lib`) has circular `require`s. Rollup's CommonJS
// transform can order those modules differently from one build to the next, and an unlucky
// order ships a bundle that throws "Class extends value undefined" on load (blank page).
// Pointing the SDK at its pre-bundled browser build keeps the module graph fixed. Resolving
// relative to the importer keeps each consumer on its own SDK version.
const SPEECH_SDK = 'microsoft-cognitiveservices-speech-sdk';
const speechSdkBrowserBundle = {
  name: 'speech-sdk-browser-bundle',
  enforce: 'pre' as const,
  async resolveId(this: any, source: string, importer?: string) {
    if (source !== SPEECH_SDK || !importer) {
      return null;
    }
    return this.resolve(`${SPEECH_SDK}/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle.js`, importer, {
      skipSelf: true,
    });
  },
};

export default defineConfig({
  plugins: [speechSdkBrowserBundle, react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: isGallery
    ? { entries: ['gallery.html'], exclude: ['botframework-webchat'] }
    : { include: ['botframework-webchat'] },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Do not emit production source maps: server.js serves `dist/` statically, so
    // published `.map` files would expose the original source. Flip to 'hidden' if
    // you upload maps to an error-monitoring service out-of-band.
    sourcemap: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/chatBot': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
    },
  },
});
