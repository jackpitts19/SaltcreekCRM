"use client"

import { usePathname } from "next/navigation"
import Sidebar from "./Sidebar"
import { MobileSidebarProvider, useMobileSidebar } from "@/lib/mobileSidebar"

const NO_SIDEBAR_PATHS = ["/login", "/setup-2fa"]

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideSidebar = NO_SIDEBAR_PATHS.includes(pathname)
  const { open, setOpen } = useMobileSidebar()

  if (hideSidebar) {
    return <div className="h-full w-full">{children}</div>
  }

  return (
    <>
      <Sidebar />
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <main className="flex-1 min-h-screen overflow-auto bg-slate-50 md:ml-56">
        {children}
      </main>
    </>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MobileSidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </MobileSidebarProvider>
  )
}
