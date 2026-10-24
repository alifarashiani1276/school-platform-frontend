// Hex values from the spec. `darkPrimary` is a lighter primary used in dark mode for contrast.
export const PALETTES = {
  purple: { primary: '#7D40FF', darkPrimary: '#9B6BFF', secondary: '#A78BFA', accent: '#F5C451' },
  ocean: { primary: '#2878E5', darkPrimary: '#5B9BF0', secondary: '#61B6F5', accent: '#44D7B6' },
  mint: { primary: '#159A79', darkPrimary: '#3FBF9B', secondary: '#68DDB5', accent: '#F5C451' },
  coral: { primary: '#F06464', darkPrimary: '#F58585', secondary: '#FFAD87', accent: '#F8D66D' },
  indigo: { primary: '#4F46C8', darkPrimary: '#7C75E8', secondary: '#818CF8', accent: '#F0B7E8' },
}

export const PALETTE_IDS = Object.keys(PALETTES)
export const DEFAULT_PALETTE = 'purple'

// Neutral surfaces per mode (space-separated RGB channels, as Tailwind expects).
export const SURFACES = {
  light: {
    background: '252 251 255',
    foreground: '38 33 74',
    card: '255 255 255',
    muted: '242 241 248',
    border: '227 224 240',
    'muted-foreground': '101 96 140',
  },
  dark: {
    background: '20 18 33',
    foreground: '240 238 252',
    card: '31 28 50',
    muted: '44 40 70',
    border: '56 52 84',
    'muted-foreground': '176 171 208',
  },
}
