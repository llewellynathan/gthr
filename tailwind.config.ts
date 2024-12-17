import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: '#f0f9ff',
          // ... add your brand colors
        },
        event: {
          pending: '#FFA500',
          confirmed: '#22C55E',
          cancelled: '#EF4444',
        }
      },
    },
  },
  plugins: [],
} satisfies Config;
