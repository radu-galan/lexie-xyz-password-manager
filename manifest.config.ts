import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

const isFirefox = process.env.TARGET === 'firefox'

export default defineManifest({
    manifest_version: 3,
    name: 'Lexie Password Manager',
    description: 'A private, client-side password vault. Your keys and passwords never leave your browser.',
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
        ? {
              scripts: ['src/background/service-worker.ts'],
              type: 'module',
          }
        : {
              service_worker: 'src/background/service-worker.ts',
              type: 'module',
          },
    permissions: ['storage'],
    ...(isFirefox && {
        browser_specific_settings: {
            gecko: {
                id: 'lexie-password-manager@lexie.xyz',
                strict_min_version: '109.0',
            },
        },
    }),
})
