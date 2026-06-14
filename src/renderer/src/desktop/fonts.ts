// Self-hosted fonts for full offline use.
//
// The web admin loads Fraunces / Hanken Grotesk / JetBrains Mono from the Google
// Fonts CDN. A desktop app shouldn't depend on a network round-trip just to
// render its own type, so we bundle the exact same families via @fontsource.
// These packages register the same family names ("Fraunces", "Hanken Grotesk",
// "JetBrains Mono") that index.css references, so nothing else changes.
//
// We import the full per-weight files (all subsets, incl. latin-ext) rather than
// latin-only — Yoruba names in the data carry diacritics (ẹ, ọ, ṣ) that live in
// the extended ranges, and they must render correctly.

// Fraunces — display / headings (light → bold).
import '@fontsource/fraunces/300.css'
import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/700.css'

// Hanken Grotesk — body / UI (regular → extrabold).
import '@fontsource/hanken-grotesk/400.css'
import '@fontsource/hanken-grotesk/500.css'
import '@fontsource/hanken-grotesk/600.css'
import '@fontsource/hanken-grotesk/700.css'
import '@fontsource/hanken-grotesk/800.css'

// JetBrains Mono — labels / data / kbd.
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
