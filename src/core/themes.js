/* ============================================================
   themes.js — 6 pre-built theme presets
   ============================================================
   Each theme is a complete design system: colors, fonts,
   border radius, button style. Picking a theme sets ALL of
   these at once. After that, branding lets the user fine-tune
   individual pieces.

   Theme shape:
     {
       id, name, description,
       colors: { accent, ink, paper, surface, line, muted },
       fonts:  { heading, body, googleFonts: 'URL' },
       radius: 'sharp' | 'rounded' | 'pill',
       buttonStyle: 'filled' | 'outlined' | 'pill'
     }
   ============================================================ */

export const THEMES = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, calm, lots of whitespace. A good default.',
    colors: {
      accent:  '#1e88e5',
      ink:     '#0f1419',
      paper:   '#fafaf7',
      surface: '#ffffff',
      line:    '#e5e3dc',
      muted:   '#6b6b6b'
    },
    fonts: {
      heading: 'Fraunces',
      body:    'Inter',
      googleFonts: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Inter:wght@400;500;600&display=swap'
    },
    radius: 'rounded',
    buttonStyle: 'filled'
  },

  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Sharp edges, strong contrast, tech-forward.',
    colors: {
      accent:  '#2563eb',
      ink:     '#111827',
      paper:   '#f3f4f6',
      surface: '#ffffff',
      line:    '#d1d5db',
      muted:   '#6b7280'
    },
    fonts: {
      heading: 'Space Grotesk',
      body:    'Space Grotesk',
      googleFonts: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap'
    },
    radius: 'sharp',
    buttonStyle: 'filled'
  },

  bold: {
    id: 'bold',
    name: 'Bold',
    description: 'High-energy, blocky, impossible to ignore.',
    colors: {
      accent:  '#f97316',
      ink:     '#0c0a09',
      paper:   '#fffaf5',
      surface: '#ffffff',
      line:    '#000000',
      muted:   '#44403c'
    },
    fonts: {
      heading: 'Archivo Black',
      body:    'Archivo',
      googleFonts: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Archivo+Black&display=swap'
    },
    radius: 'sharp',
    buttonStyle: 'filled'
  },

  warm: {
    id: 'warm',
    name: 'Warm',
    description: 'Earthy, friendly, hospitality vibe.',
    colors: {
      accent:  '#c2410c',
      ink:     '#44403c',
      paper:   '#fef7ed',
      surface: '#fffbf5',
      line:    '#e7d9c4',
      muted:   '#78716c'
    },
    fonts: {
      heading: 'Playfair Display',
      body:    'Nunito',
      googleFonts: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap'
    },
    radius: 'pill',
    buttonStyle: 'filled'
  },

  technical: {
    id: 'technical',
    name: 'Technical',
    description: 'Engineer-forward, monospace accents, precise.',
    colors: {
      accent:  '#0891b2',
      ink:     '#1e293b',
      paper:   '#f8fafc',
      surface: '#ffffff',
      line:    '#cbd5e1',
      muted:   '#64748b'
    },
    fonts: {
      heading: 'JetBrains Mono',
      body:    'IBM Plex Sans',
      googleFonts: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600;700&display=swap'
    },
    radius: 'sharp',
    buttonStyle: 'outlined'
  },

  dark: {
    id: 'dark',
    name: 'Dark',
    description: 'Full dark mode with a vibrant accent.',
    colors: {
      accent:  '#a78bfa',
      ink:     '#f1f5f9',       // text
      paper:   '#0f172a',       // page bg
      surface: '#1e293b',       // card bg
      line:    '#334155',
      muted:   '#94a3b8'
    },
    fonts: {
      heading: 'Outfit',
      body:    'Outfit',
      googleFonts: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap'
    },
    radius: 'rounded',
    buttonStyle: 'filled'
  }
};

// The list of Google Fonts we expose in the font picker dropdown.
// Each entry includes the URL needed to load it.
export const FONT_LIBRARY = [
  { name: 'Inter',            category: 'Sans',    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { name: 'Outfit',           category: 'Sans',    url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap' },
  { name: 'Space Grotesk',    category: 'Sans',    url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
  { name: 'IBM Plex Sans',    category: 'Sans',    url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap' },
  { name: 'Nunito',           category: 'Sans',    url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap' },
  { name: 'Archivo',          category: 'Sans',    url: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap' },
  { name: 'Work Sans',        category: 'Sans',    url: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap' },
  { name: 'DM Sans',          category: 'Sans',    url: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap' },
  { name: 'Archivo Black',    category: 'Display', url: 'https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap' },
  { name: 'Fraunces',         category: 'Serif',   url: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&display=swap' },
  { name: 'Playfair Display', category: 'Serif',   url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap' },
  { name: 'Lora',             category: 'Serif',   url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap' },
  { name: 'Merriweather',     category: 'Serif',   url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap' },
  { name: 'JetBrains Mono',   category: 'Mono',    url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap' },
  { name: 'IBM Plex Mono',    category: 'Mono',    url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap' }
];

// Map a font name to its loader URL
export function fontUrl(name) {
  return FONT_LIBRARY.find(f => f.name === name)?.url;
}

// Returns one combined Google Fonts URL for a heading + body pair
export function combineFontUrls(heading, body) {
  const urls = new Set();
  if (heading) { const u = fontUrl(heading); if (u) urls.add(u); }
  if (body)    { const u = fontUrl(body);    if (u) urls.add(u); }
  return Array.from(urls);
}

// Radius values in pixels, keyed by style
export const RADIUS_MAP = {
  sharp:   { card: '0px',  button: '0px',  input: '0px'  },
  rounded: { card: '10px', button: '8px',  input: '7px'  },
  pill:    { card: '16px', button: '999px', input: '10px' }
};
