import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Pichavaram Poster Studio" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/studio");
  return (
    <div className="shell flex justify-center pt-10 pb-10">
      <div className="panel w-full max-w-md p-8 sm:p-10">
        <h1 className="display text-4xl">Sign in</h1>
        <p className="muted mt-3 leading-relaxed">Use the email the Web Admin added to the RC list. We&apos;ll send you a 6-digit code.</p>
        <LoginForm />
      </div>
    </div>
  );
}
