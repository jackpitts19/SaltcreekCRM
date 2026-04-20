import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import ClientRoot from "@/components/layout/ClientRoot";

export const metadata: Metadata = {
  title: "Salt Creek Advisory",
  description: "Salt Creek Advisory CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex">
        <ClientRoot>
          <Sidebar />
          <main className="flex-1 ml-56 min-h-screen overflow-auto bg-slate-50">
            {children}
          </main>
        </ClientRoot>
      </body>
    </html>
  );
}
