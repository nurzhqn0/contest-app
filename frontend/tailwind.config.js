/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Outfit'", "sans-serif"],
        display: ["'Newsreader'", "serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      colors: {
        ink: "#171716",
        canvas: "#fbfaf7",
        surface: "#ffffff",
        muted: "#6f6a61",
        line: "#e6e1d8",
        accent: "#295c48",
        accentSoft: "#edf3ec",
        blueSoft: "#e1f3fe",
        yellowSoft: "#fbf3db",
        redSoft: "#fdebec"
      },
      boxShadow: {
        panel: "0 1px 0 rgba(23, 23, 22, 0.03), 0 18px 40px -30px rgba(23, 23, 22, 0.18)"
      },
      borderRadius: {
        none: '0px',
        xs: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px'
      }
    }
  },
  plugins: []
};
