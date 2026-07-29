import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Carried over from PhysiqueTheme.accent in the SwiftUI app so the
        // web app reads as the same product.
        accent: '#59d9d9',
        ish: '#59d9d9',
        sal: '#f0a3c4',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
