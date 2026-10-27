/**
 * High-contrast, domain-authentic SVG data-URL visual assets for posts, stories, and avatars.
 * Guarantees 100% offline/hermetic reliability (zero external broken image URLs).
 */

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const AVATAR_ASSETS = {
  elena: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1E1B4B"/>
          <stop offset="55%" stop-color="#4338CA"/>
          <stop offset="100%" stop-color="#0F172A"/>
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="120" fill="url(#g1)"/>
      <circle cx="120" cy="92" r="40" fill="#E2E8F0"/>
      <path d="M52 214C58 164 86 146 120 146C154 146 182 164 188 214" fill="#C7D2FE"/>
      <circle cx="176" cy="58" r="14" fill="#818CF8" opacity="0.5"/>
    </svg>
  `),
  marcus: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="g2" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="#0F172A"/>
          <stop offset="60%" stop-color="#312E81"/>
          <stop offset="100%" stop-color="#6D28D9"/>
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="120" fill="url(#g2)"/>
      <path d="M74 96 A46 46 0 0 1 166 96" stroke="#818CF8" stroke-width="10" fill="none"/>
      <rect x="64" y="86" width="16" height="32" rx="8" fill="#6366F1"/>
      <rect x="160" y="86" width="16" height="32" rx="8" fill="#6366F1"/>
      <circle cx="120" cy="96" r="36" fill="#F1F5F9"/>
      <path d="M56 216C64 166 90 148 120 148C150 148 176 166 184 216" fill="#94A3B8"/>
    </svg>
  `),
  sora: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="50%" stop-color="#4C1D95"/>
          <stop offset="100%" stop-color="#1E293B"/>
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="120" fill="url(#g3)"/>
      <circle cx="120" cy="92" r="38" fill="#F8FAFC"/>
      <path d="M58 214C64 168 88 148 120 148C152 148 176 168 182 214" fill="#DDD6FE"/>
    </svg>
  `),
  devon: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="g4" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#090D16"/>
          <stop offset="60%" stop-color="#1E3A8A"/>
          <stop offset="100%" stop-color="#4338CA"/>
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="120" fill="url(#g4)"/>
      <circle cx="120" cy="94" r="38" fill="#E2E8F0"/>
      <path d="M56 214C62 166 88 148 120 148C152 148 178 166 184 214" fill="#93C5FD"/>
    </svg>
  `),
};

export const POST_MEDIA_ASSETS = {
  architectureStudio: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#090B10"/>
          <stop offset="55%" stop-color="#181B2E"/>
          <stop offset="100%" stop-color="#0F111A"/>
        </linearGradient>
        <linearGradient id="warmGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.85"/>
          <stop offset="60%" stop-color="#EA580C" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#6366F1" stop-opacity="0.1"/>
        </linearGradient>
      </defs>
      <rect width="960" height="720" fill="url(#sky)"/>
      <!-- Brutalist Concrete Volumes -->
      <rect x="70" y="130" width="820" height="440" fill="#161923" stroke="#2D3348" stroke-width="2"/>
      <rect x="110" y="175" width="350" height="260" fill="url(#warmGlow)"/>
      <rect x="490" y="175" width="360" height="260" fill="url(#warmGlow)"/>
      <!-- Architectural Mullions -->
      <line x1="225" y1="175" x2="225" y2="435" stroke="#161923" stroke-width="8"/>
      <line x1="345" y1="175" x2="345" y2="435" stroke="#161923" stroke-width="8"/>
      <line x1="610" y1="175" x2="610" y2="435" stroke="#161923" stroke-width="8"/>
      <line x1="730" y1="175" x2="730" y2="435" stroke="#161923" stroke-width="8"/>
      <!-- Cantilever Terrace & Reflection -->
      <rect x="40" y="435" width="880" height="36" fill="#232736"/>
      <rect x="70" y="570" width="820" height="110" fill="#0B0D14" opacity="0.9"/>
      <path d="M110 580 L850 580" stroke="#6366F1" stroke-opacity="0.45" stroke-width="2"/>
      <text x="110" y="645" fill="#94A3B8" font-family="monospace" font-size="18" letter-spacing="3">MONOLITH STUDIO // ZURICH NIGHT SESSION 35MM</text>
    </svg>
  `),
  modularSynth: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720">
      <defs>
        <linearGradient id="chassis" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0B0D13"/>
          <stop offset="100%" stop-color="#171A26"/>
        </linearGradient>
      </defs>
      <rect width="960" height="720" fill="url(#chassis)"/>
      <!-- Eurorack Modules -->
      <rect x="60" y="70" width="260" height="580" rx="8" fill="#121521" stroke="#2E364F" stroke-width="2"/>
      <rect x="340" y="70" width="280" height="580" rx="8" fill="#141826" stroke="#3730A3" stroke-width="2"/>
      <rect x="640" y="70" width="260" height="580" rx="8" fill="#121521" stroke="#2E364F" stroke-width="2"/>
      <!-- Rotary Encoders & LED Rings -->
      <circle cx="190" cy="190" r="48" fill="#090B10" stroke="#6366F1" stroke-width="4"/>
      <line x1="190" y1="190" x2="218" y2="162" stroke="#F8FAFC" stroke-width="4" stroke-linecap="round"/>
      <circle cx="480" cy="190" r="56" fill="#090B10" stroke="#8B5CF6" stroke-width="5"/>
      <line x1="480" y1="190" x2="480" y2="142" stroke="#A78BFA" stroke-width="4" stroke-linecap="round"/>
      <circle cx="770" cy="190" r="48" fill="#090B10" stroke="#F59E0B" stroke-width="4"/>
      <line x1="770" y1="190" x2="800" y2="175" stroke="#FBBF24" stroke-width="4" stroke-linecap="round"/>
      <!-- Oscilloscope Waveform Screen -->
      <rect x="370" y="290" width="220" height="120" rx="6" fill="#06080E" stroke="#4F46E5" stroke-width="1.5"/>
      <path d="M385 350 Q 415 295, 445 350 T 505 350 T 565 350" fill="none" stroke="#818CF8" stroke-width="3.5"/>
      <!-- Braided Patch Cables -->
      <path d="M190 480 C 240 640, 420 620, 480 480" fill="none" stroke="#6366F1" stroke-width="10" stroke-linecap="round"/>
      <path d="M480 510 C 560 660, 710 640, 770 480" fill="none" stroke="#EC4899" stroke-width="8" stroke-linecap="round"/>
      <text x="85" y="620" fill="#94A3B8" font-family="monospace" font-size="16" letter-spacing="2">GRANULAR ENGINE // PATCH 09-B (48KHZ / 24-BIT)</text>
    </svg>
  `),
  spatialTopology: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720">
      <rect width="960" height="720" fill="#090B11"/>
      <g stroke="#6366F1" stroke-opacity="0.28" stroke-width="1.5" fill="none">
        <ellipse cx="480" cy="360" rx="340" ry="120"/>
        <ellipse cx="480" cy="360" rx="260" ry="200"/>
        <ellipse cx="480" cy="360" rx="160" ry="270"/>
      </g>
      <circle cx="480" cy="360" r="88" fill="#1E1B4B" stroke="#818CF8" stroke-width="3"/>
      <circle cx="280" cy="290" r="18" fill="#6366F1"/>
      <circle cx="690" cy="420" r="22" fill="#8B5CF6"/>
      <circle cx="540" cy="190" r="14" fill="#38BDF8"/>
      <line x1="280" y1="290" x2="480" y2="360" stroke="#818CF8" stroke-width="2" stroke-dasharray="6 6"/>
      <line x1="690" y1="420" x2="480" y2="360" stroke="#A78BFA" stroke-width="2" stroke-dasharray="6 6"/>
      <text x="80" y="645" fill="#94A3B8" font-family="monospace" font-size="17" letter-spacing="2.5">DISTRIBUTED MESH TOPOLOGY // LATENCY BENCHMARK</text>
    </svg>
  `),
};

export const STORY_MEDIA_ASSETS = {
  tokyoRain: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 960">
      <defs>
        <linearGradient id="st1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#090D16"/>
          <stop offset="50%" stop-color="#1E1B4B"/>
          <stop offset="100%" stop-color="#0F172A"/>
        </linearGradient>
      </defs>
      <rect width="540" height="960" fill="url(#st1)"/>
      <circle cx="270" cy="340" r="130" fill="#6366F1" opacity="0.22"/>
      <rect x="80" y="180" width="380" height="480" rx="24" fill="#131724" stroke="#4F46E5" stroke-width="2"/>
      <path d="M130 490 L230 350 L320 440 L410 310" fill="none" stroke="#818CF8" stroke-width="6" stroke-linecap="round"/>
      <circle cx="410" cy="310" r="12" fill="#F59E0B"/>
      <text x="115" y="585" fill="#E2E8F0" font-family="sans-serif" font-weight="bold" font-size="26">Late Night Mastering</text>
      <text x="115" y="622" fill="#94A3B8" font-family="monospace" font-size="16">STUDIO B · SHIBUYA EAST</text>
    </svg>
  `),
  shaderPrototype: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 960">
      <defs>
        <linearGradient id="st2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0F172A"/>
          <stop offset="55%" stop-color="#3B0764"/>
          <stop offset="100%" stop-color="#090D16"/>
        </linearGradient>
      </defs>
      <rect width="540" height="960" fill="url(#st2)"/>
      <circle cx="270" cy="440" r="155" fill="none" stroke="#A855F7" stroke-width="4"/>
      <circle cx="270" cy="440" r="105" fill="none" stroke="#6366F1" stroke-width="3" stroke-dasharray="12 8"/>
      <circle cx="270" cy="440" r="52" fill="#8B5CF6" opacity="0.45"/>
      <text x="105" y="720" fill="#F8FAFC" font-family="sans-serif" font-weight="bold" font-size="26">WebRTC Audio Room Live</text>
      <text x="105" y="756" fill="#C4B5FD" font-family="monospace" font-size="16">JOIN #SYNTH-LAB VOICE CHANNEL</text>
    </svg>
  `),
};
