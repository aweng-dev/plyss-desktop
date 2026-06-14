// electron-builder configuration (JS so mac signing/notarization can be gated on
// the presence of credentials — see the conditional `mac.notarize` below).
//
// Behaviour:
//  • No creds in the environment  → unsigned build, no notarization (local dev,
//    and CI until the secrets are added). Identical to the previous YAML config.
//  • CSC_LINK + CSC_KEY_PASSWORD present (a Developer ID .p12) → electron-builder
//    signs the macOS app automatically.
//  • …plus APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID → the signed
//    app is also notarized (required for macOS auto-update + a clean Gatekeeper
//    launch). Windows/Linux ignore all of this.

const canSignMac = Boolean(process.env.CSC_LINK && process.env.CSC_KEY_PASSWORD)
const canNotarizeMac =
  canSignMac &&
  Boolean(process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID)

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'ng.plyss.admin',
  productName: 'PLYSS Admin',
  copyright: '© PLYSS — Plateau Yoruba Statistical Survey',

  directories: {
    buildResources: 'build',
    output: 'dist-app',
  },

  // electron-vite emits the compiled main/preload/renderer into out/.
  files: ['out/**/*', 'package.json'],

  asarUnpack: ['resources/**'],

  // Platform icons are auto-derived from build/icon.png (1024×1024).

  mac: {
    category: 'public.app-category.business',
    target: ['dmg', 'zip'],
    hardenedRuntime: true,
    gatekeeperAssess: false,
    // Notarize only when both signing and notarization credentials are present;
    // otherwise `false` keeps unsigned/local builds working unchanged.
    notarize: canNotarizeMac ? { teamId: process.env.APPLE_TEAM_ID } : false,
  },

  dmg: {
    artifactName: '${productName}-${version}-${arch}.${ext}',
  },

  win: {
    target: ['nsis'],
    artifactName: '${productName}-${version}-Setup.${ext}',
  },

  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
  },

  linux: {
    target: ['AppImage', 'deb'],
    category: 'Office',
    maintainer: 'PLYSS',
    artifactName: '${productName}-${version}.${ext}',
  },

  // Releases + auto-update are served from the public GitHub repo. electron-builder
  // uploads the installers and the update manifests (latest*.yml) to a GitHub
  // Release, and bakes an app-update.yml into the app so electron-updater can find
  // them at runtime (no token needed for a public repo).
  publish: {
    provider: 'github',
    owner: 'aweng-dev',
    repo: 'plyss-desktop',
  },
}
