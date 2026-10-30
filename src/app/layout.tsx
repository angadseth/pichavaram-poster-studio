import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { SignOut } from "@/components/sign-out";
import "./globals.css";

const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pichavaram Poster Studio",
  description: "Pichavaram House RCs ask for event posters; the design team makes them and emails them over.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  return (
    <html lang="en" className={`${serif.variable} ${geist.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <header className="topbar">
          <div className="shell flex h-[68px] items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/crests/pichavaram.webp" alt="" width={34} height={34} className="crest" />
              <span className="display text-[22px] leading-none">
                Pichavaram <span className="muted">Poster Studio</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              {user ? (
                <>
                  <Link className="navlink hidden sm:inline-flex" href="/studio">Request a poster</Link>
                  <Link className="navlink" href="/requests">My requests</Link>
                  {user.role !== "rc" ? <Link className="navlink" href="/work">My work</Link> : null}
                  {user.role === "admin" ? <Link className="navlink" href="/admin">Admin</Link> : null}
                  <SignOut />
                </>
              ) : (
                <Link className="btn btn-ghost btn-sm" href="/login">Sign in</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1 pb-24">{children}</main>
        <footer className="border-t border-[var(--line)]">
          <div className="shell flex flex-col gap-2 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="muted">Pichavaram House, IIT Madras BS Degree</span>
            <span className="text-[var(--ivory-2)]">Made by Angad Jangid, IIT Madras — Web Admin</span>
          </div>
        </footer>
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
