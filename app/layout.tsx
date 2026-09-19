import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "bpy-compass",
  description:
    "Version-aware Blender Python (bpy) answers, grounded in a Sanity Context Knowledge Base.",
};

const NAV = [
  { href: "/", label: "Ask" },
  { href: "/eval", label: "Eval" },
  { href: "/about", label: "How it works" },
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav
            aria-label="Main navigation"
            className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3"
          >
            <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
              bpy-compass
            </Link>
            <ul className="flex gap-4 text-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-zinc-200 px-4 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
          DEV Sanity Challenge · Path One · Answers come from a Sanity Context Knowledge Base, not from memory.
        </footer>
      </body>
    </html>
  );
}
