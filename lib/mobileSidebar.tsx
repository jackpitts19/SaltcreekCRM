"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface MobileSidebarCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const Ctx = createContext<MobileSidebarCtx>({ open: false, setOpen: () => {} });

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}

export function useMobileSidebar() {
  return useContext(Ctx);
}
