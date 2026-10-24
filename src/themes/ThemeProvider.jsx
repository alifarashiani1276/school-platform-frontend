import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_PALETTE, PALETTES, SURFACES } from './palettes'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'school-theme'

const hexToChannels = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

// Pick dark or white text for a given background, by perceived luminance.
const readableOn = (hex) => {
  const [r, g, b] = hexToChannels(hex).split(' ').map(Number)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '38 33 74' : '255 255 255'
}

const loadSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

export function ThemeProvider({ children }) {
  const [saved] = useState(loadSaved)
  const [palette, setPalette] = useState(PALETTES[saved.palette] ? saved.palette : DEFAULT_PALETTE)
  const [mode, setMode] = useState(saved.mode === 'dark' ? 'dark' : 'light')

  useEffect(() => {
    const colors = PALETTES[palette]
    const primary = mode === 'dark' ? colors.darkPrimary : colors.primary
    const vars = {
      ...SURFACES[mode],
      primary: hexToChannels(primary),
      'primary-foreground': readableOn(primary),
      secondary: hexToChannels(colors.secondary),
      'secondary-foreground': readableOn(colors.secondary),
      accent: hexToChannels(colors.accent),
      'accent-foreground': readableOn(colors.accent),
    }
    const root = document.documentElement
    Object.entries(vars).forEach(([name, value]) => root.style.setProperty(`--${name}`, value))
    root.classList.toggle('dark', mode === 'dark')
    root.style.colorScheme = mode
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ palette, mode }))
  }, [palette, mode])

  const value = useMemo(() => ({ palette, setPalette, mode, setMode }), [palette, mode])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
