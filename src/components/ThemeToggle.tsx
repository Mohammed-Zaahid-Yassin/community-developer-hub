"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
      >
        <span className="w-4 h-4" />
      </button>
    );
  }

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <button
      onClick={cycleTheme}
      title={`Current: ${theme} mode (Click to switch)`}
      aria-label="Toggle theme mode"
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {theme === "dark" ? (
        <Moon className="w-4 h-4 text-indigo-400" />
      ) : theme === "light" ? (
        <Sun className="w-4 h-4 text-amber-500" />
      ) : (
        <Monitor className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
      )}
    </button>
  );
}
