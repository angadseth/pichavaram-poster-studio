import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { SignOut } from "@/components/sign-out";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz", "SOFT"] });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pichavaram Poster Studio",
  description: "Event posters for Pichavaram House RCs, designed and emailed in about a minute.",
};

function Roots() {
  // mangrove roots drawn into the water line at the bottom of every page
  const paths = Array.from({ length: 14 }, (_, i) => {
    const x = 40 + i * 105;
    return `M${x} 0 C ${x - 30} 80, ${x + 40} 120, ${x - 10} 220 M${x} 40 C ${x + 50} 110, ${x + 10} 170, ${x + 60} 220`;
  }).join(" ");
  return (
    <svg className="roots" viewBox="0 0 1500 220" preserveAspectRatio="none" aria-hidden>
      <path d={paths} fill="none" stroke="#c9a15a" strokeOpacity="0.25" strokeWidth="1.2" />
    </svg>
  );
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  return (
    <html lang="en" className={`${fraunces.variable} ${hanken.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <header className="shell flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-3">
            <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
              <circle cx="17" cy="17" r="16" fill="none" stroke="#c9a15a" strokeOpacity=".6" />
              <path d="M17 6 C23 12 23 18 17 24 C11 18 11 12 17 6Z" fill="#c9a15a" />
              <path d="M17 24 V29 M17 26 C13 27 11 29 10 30 M17 26 C21 27 23 29 24 30" stroke="#c9a15a" strokeWidth="1.3" fill="none" />
            </svg>
            <span className="display text-xl">Pichavaram Poster Studio</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            {user ? (
              <>
                <Link className="btn btn-ghost btn-sm hidden sm:inline-flex" href="/studio">New poster</Link>
                <Link className="btn btn-ghost btn-sm" href="/requests">My posters</Link>
                {user.role === "admin" ? <Link className="btn btn-ghost btn-sm" href="/admin">Admin</Link> : null}
                <SignOut />
              </>
            ) : (
              <Link className="btn btn-ghost btn-sm" href="/login">Sign in</Link>
            )}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="shell mt-24 flex flex-col gap-2 border-t border-[var(--line)] py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="muted">Pichavaram House, IIT Madras BS Degree</span>
          <span>Made by Angad Jangid, IIT Madras — Web Admin</span>
        </footer>
        <Roots />
      </body>
    </html>
  );
}
