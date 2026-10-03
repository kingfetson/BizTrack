import type { Metadata } from "next";
// @ts-expect-error Next.js processes this stylesheet import at build time.
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "BizTrack",
  description: "Simple inventory and sales management for small businesses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-darkbrown text-slate-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}