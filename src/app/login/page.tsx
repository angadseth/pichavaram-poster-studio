import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Pichavaram Poster Studio" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/studio");
  return (
    <div className="shell grid items-center gap-12 pt-14 lg:grid-cols-[1fr_minmax(0,440px)] lg:pt-24">
      <div className="hidden lg:block">
        <h1 className="display masthead text-[clamp(64px,9vw,150px)]">
          Sign <em>in</em>
        </h1>
        <p className="muted mt-6 max-w-md text-lg leading-relaxed">
          For Pichavaram House Regional Coordinators. No password: we email you a six-digit code.
        </p>
      </div>
      <div className="panel w-full p-8 sm:p-10">
        <h2 className="display text-4xl lg:hidden">Sign in</h2>
        <h2 className="display hidden text-3xl lg:block">Your RC email</h2>
        <p className="muted mt-3 leading-relaxed">Use the email the Web Admin added to the RC list. We&apos;ll send you a 6-digit code.</p>
        <LoginForm />
      </div>
    </div>
  );
}
