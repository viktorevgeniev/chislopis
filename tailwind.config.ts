import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          container: "hsl(var(--primary-container))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          container: "hsl(var(--secondary-container))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        tertiary: "hsl(var(--tertiary))",
        outline: "hsl(var(--outline))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        cat: {
          blue:    { bg: "hsl(var(--cat-blue-bg))",    border: "hsl(var(--cat-blue-border))",    chip: "hsl(var(--cat-blue-chip))",    fg: "hsl(var(--cat-blue-fg))",    solid: "hsl(var(--cat-blue-solid))"    },
          green:   { bg: "hsl(var(--cat-green-bg))",   border: "hsl(var(--cat-green-border))",   chip: "hsl(var(--cat-green-chip))",   fg: "hsl(var(--cat-green-fg))",   solid: "hsl(var(--cat-green-solid))"   },
          purple:  { bg: "hsl(var(--cat-purple-bg))",  border: "hsl(var(--cat-purple-border))",  chip: "hsl(var(--cat-purple-chip))",  fg: "hsl(var(--cat-purple-fg))",  solid: "hsl(var(--cat-purple-solid))"  },
          red:     { bg: "hsl(var(--cat-red-bg))",     border: "hsl(var(--cat-red-border))",     chip: "hsl(var(--cat-red-chip))",     fg: "hsl(var(--cat-red-fg))",     solid: "hsl(var(--cat-red-solid))"     },
          orange:  { bg: "hsl(var(--cat-orange-bg))",  border: "hsl(var(--cat-orange-border))",  chip: "hsl(var(--cat-orange-chip))",  fg: "hsl(var(--cat-orange-fg))",  solid: "hsl(var(--cat-orange-solid))"  },
          indigo:  { bg: "hsl(var(--cat-indigo-bg))",  border: "hsl(var(--cat-indigo-border))",  chip: "hsl(var(--cat-indigo-chip))",  fg: "hsl(var(--cat-indigo-fg))",  solid: "hsl(var(--cat-indigo-solid))"  },
          emerald: { bg: "hsl(var(--cat-emerald-bg))", border: "hsl(var(--cat-emerald-border))", chip: "hsl(var(--cat-emerald-chip))", fg: "hsl(var(--cat-emerald-fg))", solid: "hsl(var(--cat-emerald-solid))" },
        },
      },
      fontFamily: {
        headline: ['var(--font-headline)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        ambient: 'var(--shadow-ambient)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
