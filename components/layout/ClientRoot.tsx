"use client";

import { useState, useEffect } from "react";
import { UserProvider } from "@/lib/userContext";
import { ToastProvider } from "@/lib/toast";
import CommandPalette from "@/components/ui/CommandPalette";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <UserProvider>
      <ToastProvider>
        {children}
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </ToastProvider>
    </UserProvider>
  );
}
