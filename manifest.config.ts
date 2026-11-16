import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

// One source for both builds: `npm run build` (Chrome, dist/) and
// `npm run build:firefox` (Firefox, dist-firefox/). Firefox MV3 has no
// background service workers, so it gets the same script as an event page.
const isFirefox = process.env.VITE_BROWSER === 'firefox'

export default defineManifest({
    manifest_version: 3,
    name: 'Lexie Password Manager',
    description: 'A private password vault, encrypted in your browser. Optionally save it, still encrypted, to your lexie.xyz account.',
    version: pkg.version,
    action: {
        default_icon: {
            16: 'icons/icon-16.png',
            32: 'icons/icon-32.png',
            48: 'icons/icon-48.png',
            128: 'icons/icon-128.png',
        },
    },
    icons: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
    },
    background: isFirefox
        ? { scripts: ['src/background/service-worker.ts'], type: 'module' }
        : { service_worker: 'src/background/service-worker.ts', type: 'module' },
    permissions: ['storage'],
    // Only the www.lexie.xyz account API (sign in + saved vault versions).
    host_permissions: ['https://apiwww.lexie.xyz/*'],
    ...(isFirefox
        ? {
              browser_specific_settings: {
                  gecko: { id: 'password-manager@lexie.xyz', strict_min_version: '115.0' },
              },
          }
        : {}),
})
