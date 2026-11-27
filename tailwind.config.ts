import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./web/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#778196",
        canvas: "#f7f9fc",
        line: "#e9edf4",
        brand: "#2762e8"
      },
      boxShadow: {
        card: "0 1px 3px rgba(20, 33, 61, 0.04)"
      }
    }
  },
  plugins: []
} satisfies Config;
