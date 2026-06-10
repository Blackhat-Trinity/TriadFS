import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))"
      },
      fontFamily: {
        sans: ["Segoe UI", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"]
      },
      backgroundImage: {
        "mesh-light": "radial-gradient(circle at 15% 20%, #ddf3ff, transparent 45%), radial-gradient(circle at 85% 0%, #ffe8cf, transparent 40%), linear-gradient(135deg, #f6f9fd, #ecf4ff)",
        "mesh-dark": "radial-gradient(circle at 10% 15%, #17314f, transparent 40%), radial-gradient(circle at 90% 10%, #46210f, transparent 45%), linear-gradient(135deg, #0b1220, #111a2d)"
      },
      boxShadow: {
        glass: "0 8px 24px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
