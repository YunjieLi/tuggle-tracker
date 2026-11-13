import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

const publicReleaseFiles = [
  'manifest.webmanifest',
  'sw.js',
  'offline.html',
  'icons/little-days.svg',
  'icons/app-192.png',
  'icons/app-512.png',
  'icons/apple-touch-icon.png',
];

export default defineConfig({
  plugins: [{
    name: 'babji-release',
    apply: 'build',
    generateBundle: {
      order: 'post',
      async handler(_, bundle) {
        const hash = createHash('sha256');
        for (const name of Object.keys(bundle).sort()) {
          const file = bundle[name];
          hash.update(name);
          hash.update(file.type === 'asset' ? file.source : file.code);
        }
        for (const name of publicReleaseFiles) {
          hash.update(await readFile(new URL(`./public/${name}`, import.meta.url)));
        }
        const version = hash.digest('hex').slice(0, 16);
        const index = bundle['index.html'];
        index.source = index.source.replace(
          '<meta name="app-release" content="" />',
          `<meta name="app-release" content="${version}" />`,
        ).replace(
          '<meta name="app-updated-at" content="" />',
          `<meta name="app-updated-at" content="${new Date().toISOString()}" />`,
        );
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
      },
    },
  }],
});
