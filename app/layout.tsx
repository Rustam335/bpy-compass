import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { NOT_IN_KB_MARKER } from "@/lib/prompt";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "bpy-compass",
  description:
    "Blender Python answers that match your Blender version, read from a Sanity Context Knowledge Base built from official release notes.",
  metadataBase: new URL("https://bpy-compass.vercel.app"),
  openGraph: {
    title: "bpy-compass",
    description: "Version-aware bpy scripting answers with cited sources.",
    url: "https://bpy-compass.vercel.app",
    siteName: "bpy-compass",
  },
};

const NAV = [
  { href: "/", label: "Ask" },
  { href: "/eval", label: "Eval" },
  { href: "/about", label: "How it works" },
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line bg-panel">
          <nav
            aria-label="Main navigation"
            className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3"
          >
            <Link href="/" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight">
              <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />
              bpy-compass
            </Link>
            <ul className="flex gap-1 text-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded-sm px-2.5 py-1 text-ink-dim hover:bg-panel-2 hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">{children}</main>
        <footer className="border-t border-line px-4 py-4 text-xs text-ink-faint">
          <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-2">
            <span>Answers are grounded in a Sanity Context Knowledge Base; code it does not back is marked <code>{NOT_IN_KB_MARKER}</code>.</span>
            <span>
              DEV Sanity Challenge, Path One.{" "}
              <a href="https://github.com/Rustam335/bpy-compass" className="underline hover:text-ink">
                Source on GitHub
              </a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
