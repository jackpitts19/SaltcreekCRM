import type { Metadata } from "next";
import "./globals.css";
import ClientRoot from "@/components/layout/ClientRoot";
import AppShell from "@/components/layout/AppShell";

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
          <AppShell>{children}</AppShell>
        </ClientRoot>
      </body>
    </html>
  );
}
